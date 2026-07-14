/** 安全读取 hostname，解析失败返回空串（与抓取 finalUrl 容错一致）。 */
export function safeHostnameLower(urlString: string): string {
  try {
    return new URL(urlString).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** 安全读取 pathname，解析失败回退为原始请求路径。 */
export function safePathname(finalUrl: string, fallbackPathname: string): string {
  try {
    return new URL(finalUrl).pathname;
  } catch {
    return fallbackPathname;
  }
}
