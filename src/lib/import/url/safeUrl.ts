export function isBlockedUrlHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h === "0000:0000:0000:0000:0000:0000:0000:0001"
  )
    return true;
  if (h.endsWith(".localhost") || h.endsWith(".local")) return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = h.match(ipv4);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 255) return true;
  }
  return false;
}

export function parseAndAssertSafeUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("INVALID_URL");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URL_CREDENTIALS_NOT_ALLOWED");
  }

  const protocol = parsed.protocol.toLowerCase();
  const allowHttp =
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_HTTP_URL_IMPORT === "true";
  if (protocol !== "https:" && !(allowHttp && protocol === "http:")) {
    throw new Error("URL_HTTPS_ONLY");
  }

  if (isBlockedUrlHost(parsed.hostname)) {
    throw new Error("URL_HOST_NOT_ALLOWED");
  }

  return parsed;
}

/**
 * 在读取响应体之前校验最终 URL（含跟随重定向后的地址）。
 * 若最终地址不满足与起始 URL 相同的安全策略，则拒绝后续处理，避免把不可信响应交给转换管线。
 *
 * 说明：底层 `fetch` 仍可能在自动跟随重定向时发起对中间 URL 的请求；若需更强隔离，应改为手动处理
 * `redirect` 或使用支持逐跳校验的运行时配置。
 */
export function assertSafeFetchedFinalUrl(finalUrl: string): void {
  try {
    parseAndAssertSafeUrl(finalUrl);
  } catch {
    throw new Error("FETCH_FINAL_URL_NOT_ALLOWED");
  }
}
