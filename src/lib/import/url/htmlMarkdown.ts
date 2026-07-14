import TurndownService from "turndown";

import { normalizeLazyImagesInHtml } from "../normalizeImportHtml";

export function extractTitleFromHtml(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const t = m?.[1]?.replace(/\s+/g, " ")?.trim();
  return t || undefined;
}

export function titleFromPathname(pathname: string): string | undefined {
  const seg = pathname.split("/").filter(Boolean).pop();
  if (!seg) return undefined;
  try {
    const base = decodeURIComponent(seg);
    const stem = base.replace(/\.(md|markdown|html?|htm)$/i, "").trim();
    return stem || undefined;
  } catch {
    return seg;
  }
}

export function htmlToMarkdown(html: string): string {
  const prepared = normalizeLazyImagesInHtml(html);
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });
  return turndown.turndown(prepared);
}

export function isLikelyHtmlDocument(body: string, contentType: string): boolean {
  const ct = contentType.toLowerCase();
  if (
    ct.includes("text/html") ||
    ct.includes("application/xhtml+xml") ||
    ct.includes("application/xhtml")
  ) {
    return true;
  }

  const head = body.trimStart().slice(0, 4096);
  const lower = head.toLowerCase();
  if (
    lower.startsWith("<!doctype html") ||
    lower.startsWith("<!doctype ") ||
    lower.startsWith("<html") ||
    /^<\s*html[\s/>]/i.test(head.slice(0, 64)) ||
    (lower.includes("<head") && lower.includes("<body"))
  ) {
    return true;
  }

  return false;
}

export function responseToMarkdown(
  body: string,
  contentType: string,
  pathname: string,
): string {
  const ct = contentType.toLowerCase();
  const pathLower = pathname.toLowerCase();

  if (isLikelyHtmlDocument(body, contentType)) {
    return htmlToMarkdown(body);
  }

  const looksMarkdownMime = ct.includes("markdown");

  const looksMarkdownPath =
    pathLower.endsWith(".md") || pathLower.endsWith(".markdown");

  if (looksMarkdownMime || looksMarkdownPath || ct.startsWith("text/plain")) {
    return body;
  }

  const sniff = body.trimStart().slice(0, 512).toLowerCase();
  if (
    sniff.startsWith("<!doctype") ||
    sniff.startsWith("<html") ||
    sniff.includes("<html")
  ) {
    return htmlToMarkdown(body);
  }

  return body;
}
