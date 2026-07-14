/**
 * 微信公众号图片防盗链：服务端按文章 Referer 拉取二进制，再上传到 EdgeStore，正文中的 img 指向自有 CDN。
 * 需配置 EDGE_STORE_ACCESS_KEY / EDGE_STORE_SECRET_KEY；建议同时配置 WECHAT_MP_FETCH_COOKIE 以提高成功率。
 */

import { createHash } from "crypto";

import { initEdgeStoreClient } from "@edgestore/server/core";

import { edgeStoreRouter } from "@/src/lib/edgestore-router";

import { buildWechatMpAssetHeaders } from "./wechatMpImport";

const WECHAT_IMAGE_HOST =
  /^(?:.*\.)?(?:mmbiz\.qpic\.cn|mmbiz\.url\.cn|wx\.qlogo\.cn|wx\.qpic\.cn)$/i;

const MAX_IMAGES_PER_ARTICLE = 35;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const IMAGE_FETCH_MS = 25_000;

export function isLikelyWechatCdnImageUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    return WECHAT_IMAGE_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

function guessImageExtension(url: string, contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";

  const fmt = url.match(/[?&]wx_fmt=([^&]+)/i);
  if (fmt?.[1]) {
    const f = fmt[1].toLowerCase();
    if (f === "png" || f === "webp" || f === "gif") return f;
    if (f === "jpeg" || f === "jpg") return "jpg";
  }

  const pathMatch = url.match(/\.(png|jpe?g|webp|gif)(\?|#|$)/i);
  if (pathMatch) {
    return pathMatch[1].toLowerCase().replace("jpeg", "jpg");
  }
  return "jpg";
}

function mimeFromExt(ext: string): string {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

function urlKeyHash(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 14);
}

async function fetchWechatImageBuffer(
  imageUrl: string,
  articlePageUrl: string,
): Promise<{ buf: ArrayBuffer; contentType: string } | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), IMAGE_FETCH_MS);
  try {
    const res = await fetch(imageUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: buildWechatMpAssetHeaders(articlePageUrl),
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (contentType.includes("text/html")) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength < 64 || buf.byteLength > MAX_IMAGE_BYTES) return null;

    const peek = new TextDecoder("latin1").decode(
      buf.slice(0, Math.min(512, buf.byteLength)),
    );
    const lowerPeek = peek.toLowerCase();
    if (lowerPeek.includes("<!doctype") || lowerPeek.includes("<html")) {
      return null;
    }

    return { buf, contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function getEdgeStoreBackend() {
  const accessKey = process.env.EDGE_STORE_ACCESS_KEY?.trim();
  const secretKey = process.env.EDGE_STORE_SECRET_KEY?.trim();
  if (!accessKey || !secretKey) return null;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined);

  return initEdgeStoreClient({
    router: edgeStoreRouter,
    accessKey,
    secretKey,
    baseUrl,
  });
}

/**
 * 将 HTML 中微信 CDN 图片替换为 EdgeStore 公网 URL（拉取失败则保留原链）。
 */
export async function rehostWechatImagesInHtml(
  html: string,
  articlePageUrl: string,
): Promise<string> {
  const client = getEdgeStoreBackend();
  if (!client) {
    return html;
  }

  const imgTagRe = /<img\b[^>]*>/gi;
  const matches: RegExpExecArray[] = [];
  let im: RegExpExecArray | null;
  while ((im = imgTagRe.exec(html)) !== null) {
    matches.push(im);
  }
  if (matches.length === 0) return html;

  const urlToPublicUrl = new Map<string, string>();
  let uploadCount = 0;

  const uploadUnique = async (srcUrl: string) => {
    if (urlToPublicUrl.has(srcUrl)) return;
    if (uploadCount >= MAX_IMAGES_PER_ARTICLE) return;

    const fetched = await fetchWechatImageBuffer(srcUrl, articlePageUrl);
    if (!fetched) return;

    const ext = guessImageExtension(srcUrl, fetched.contentType);
    const mime = mimeFromExt(ext);
    const blob = new Blob([fetched.buf], { type: mime });

    try {
      const uploaded = await client.publicFiles.upload({
        content: { blob, extension: ext },
        options: {
          manualFileName: `wx-import-${urlKeyHash(srcUrl)}.${ext}`,
        },
      });
      urlToPublicUrl.set(srcUrl, uploaded.url);
      uploadCount++;
    } catch {
      /* 保留原 URL */
    }
  };

  const srcUrls: string[] = [];
  for (const m of matches) {
    const tag = m[0];
    const srcMatch = tag.match(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i);
    const raw = srcMatch?.[2]?.trim().replace(/&amp;/g, "&");
    if (raw && /^https?:\/\//i.test(raw) && isLikelyWechatCdnImageUrl(raw)) {
      srcUrls.push(raw);
    }
  }

  const unique = Array.from(new Set(srcUrls));
  const concurrency = 4;
  for (let i = 0; i < unique.length; i += concurrency) {
    const slice = unique.slice(i, i + concurrency);
    await Promise.all(slice.map((u) => uploadUnique(u)));
  }

  let out = "";
  let last = 0;
  for (const m of matches) {
    const full = m[0];
    const idx = m.index!;
    out += html.slice(last, idx);

    const srcMatch = full.match(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i);
    const raw = srcMatch?.[2]?.trim().replace(/&amp;/g, "&") ?? "";
    const replacement = urlToPublicUrl.get(raw);
    if (replacement && srcMatch) {
      const q = srcMatch[1];
      const newTag = full.replace(
        /\bsrc\s*=\s*(["'])([\s\S]*?)\1/i,
        ` src=${q}${replacement}${q}`,
      );
      out += newTag;
    } else {
      out += full;
    }
    last = idx + full.length;
  }
  out += html.slice(last);
  return out;
}
