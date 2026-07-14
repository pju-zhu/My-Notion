/**
 * 微信公众平台文章：专用抓取与正文抽取（与通用 fetch / GitHub 逻辑解耦）。
 * 说明：mp.weixin.qq.com 对异常流量常返回验证页；可选配置 WECHAT_MP_FETCH_COOKIE 可提高成功率。
 */

import { IMPORT_URL_JSON_CODE_BODY_TOO_LARGE } from "./importUrlCodes";
import { FETCH_TIMEOUT_MS } from "./url/constants";
import { decodeResponseBody } from "./url/decodeBody";
import { getMaxUrlImportBodyBytes } from "./url/limits";
import { assertSafeFetchedFinalUrl } from "./url/safeUrl";

/** 贴近微信内置浏览器，降低被直接拦截的概率（非保证）。 */
const WECHAT_DEFAULT_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003137) NetType/WIFI Language/zh_CN";

/** 文章页资源（图片等）：Referer 须为当前文章 URL，否则常见防盗链占位图。 */
export function buildWechatMpAssetHeaders(articlePageUrl: string): HeadersInit {
  const headers: Record<string, string> = {
    "User-Agent":
      process.env.WECHAT_MP_FETCH_UA?.trim() || WECHAT_DEFAULT_UA,
    Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.6",
    Referer: articlePageUrl,
  };

  const cookie = process.env.WECHAT_MP_FETCH_COOKIE?.trim();
  if (cookie) {
    headers.Cookie = cookie;
  }

  return headers;
}

function buildWechatMpFetchHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "User-Agent":
      process.env.WECHAT_MP_FETCH_UA?.trim() || WECHAT_DEFAULT_UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.6",
    Referer: "https://mp.weixin.qq.com/",
  };

  const cookie = process.env.WECHAT_MP_FETCH_COOKIE?.trim();
  if (cookie) {
    headers.Cookie = cookie;
  }

  return headers;
}

export async function fetchWechatMpUrl(parsed: URL): Promise<{
  body: string;
  contentType: string;
  finalUrl: string;
}> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: buildWechatMpFetchHeaders(),
    });

    if (!res.ok) {
      throw new Error(`FETCH_HTTP_${res.status}`);
    }

    assertSafeFetchedFinalUrl(res.url || parsed.toString());

    const buf = await res.arrayBuffer();
    if (buf.byteLength > getMaxUrlImportBodyBytes()) {
      throw new Error(IMPORT_URL_JSON_CODE_BODY_TOO_LARGE);
    }

    const rawContentType = res.headers.get("content-type") ?? "";
    const body = decodeResponseBody(buf, rawContentType);
    const finalUrl = res.url || parsed.toString();
    return { body, contentType: rawContentType.toLowerCase(), finalUrl };
  } finally {
    clearTimeout(t);
  }
}

function decodeBasicHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

/**
 * 从带 id 的起始 &lt;div&gt; 起做深度配对，取出内部 HTML（处理嵌套 div）。
 */
export function extractInnerHtmlByDivId(
  html: string,
  elementId: string,
): string | null {
  const idLower = elementId.toLowerCase();
  let searchPos = 0;

  while (searchPos < html.length) {
    const idx = html.indexOf("<div", searchPos);
    if (idx === -1) return null;
    const tagEnd = html.indexOf(">", idx);
    if (tagEnd === -1) return null;
    const openTag = html.slice(idx, tagEnd + 1);
    const tagLower = openTag.toLowerCase();
    const hasId =
      tagLower.includes(`id="${idLower}"`) ||
      tagLower.includes(`id='${idLower}'`);
    if (hasId) {
      const contentStart = tagEnd + 1;
      let depth = 1;
      let pos = contentStart;
      const len = html.length;

      while (pos < len && depth > 0) {
        const slice = html.slice(pos);
        const openMatch = slice.match(/<div\b/i);
        const closeMatch = slice.match(/<\/div\s*>/i);
        const openIdx = openMatch?.index ?? -1;
        const closeIdx = closeMatch?.index ?? -1;

        if (closeIdx === -1) return null;

        if (openIdx !== -1 && openIdx < closeIdx) {
          depth++;
          pos += openIdx + openMatch![0].length;
        } else {
          depth--;
          const closeLen = closeMatch![0].length;
          if (depth === 0) {
            return html.slice(contentStart, pos + closeIdx);
          }
          pos += closeIdx + closeLen;
        }
      }
      return null;
    }
    searchPos = idx + 4;
  }
  return null;
}

export function extractWechatMpTitle(html: string): string | undefined {
  const og = html.match(
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
  );
  if (og?.[1]) {
    const t = decodeBasicHtmlEntities(og[1].trim());
    if (t) return t;
  }

  const activityInner = extractInnerHtmlByDivId(html, "activity-name");
  if (activityInner) {
    const text = activityInner
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 0) return decodeBasicHtmlEntities(text);
  }

  const msgTitle = html.match(
    /var\s+msg_title\s*=\s*(?:htmlDecode\s*\(\s*)?["']([^"']*)["']/,
  );
  if (msgTitle?.[1]) {
    const t = decodeBasicHtmlEntities(msgTitle[1].trim());
    if (t) return t;
  }

  return undefined;
}

/** 若页面为文章正文 HTML，返回 #js_content 内区域与标题。 */
export function extractWechatMpArticleFromHtml(html: string): {
  title?: string;
  articleHtml: string;
} | null {
  const articleHtml = extractInnerHtmlByDivId(html, "js_content");
  if (!articleHtml || articleHtml.trim().length < 20) {
    return null;
  }
  const title = extractWechatMpTitle(html);
  return { title, articleHtml: articleHtml.trim() };
}
