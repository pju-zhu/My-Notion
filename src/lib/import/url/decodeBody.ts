import iconv from "iconv-lite";

/** 从 Content-Type 头解析 charset（大小写不敏感） */
export function parseCharsetFromContentType(header: string): string | null {
  const m = header.match(/charset\s*=\s*["']?([^"';\s]+)/i);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

/** 将 charset 标签映射为 iconv-lite / TextDecoder 可用的名称 */
export function normalizeEncodingLabel(label: string): string {
  const clean = label.replace(/^["'\s]+|["'\s]+$/g, "").toLowerCase();
  const aliases: Record<string, string> = {
    utf8: "utf-8",
    "utf-8": "utf-8",
    gb2312: "gbk",
    gb_2312: "gbk",
    "gb_2312-80": "gbk",
    gbk: "gbk",
    gb18030: "gb18030",
    big5: "big5",
    "big-5": "big5",
    "cn-big5": "big5",
    shift_jis: "shift_jis",
    "shift-jis": "shift_jis",
    sjis: "shift_jis",
    "euc-jp": "eucjp",
    "euc-kr": "euckr",
    "euc_kr": "euckr",
    "iso-8859-1": "latin1",
    iso8859_1: "latin1",
    latin1: "latin1",
    "windows-1252": "win1252",
    cp936: "gbk",
    cp950: "big5",
  };
  return aliases[clean] ?? clean;
}

/**
 * 用 latin1 逐字节对照 HTML 头部，避免事先假定 UTF-8 导致无法解析 meta charset。
 */
export function sniffHtmlCharset(htmlLatin1Head: string): string | null {
  let m = htmlLatin1Head.match(/<meta\s+charset\s*=\s*["']?([^"'>\s/]+)/i);
  if (m?.[1]) return m[1];

  m = htmlLatin1Head.match(
    /<meta[^>]+http-equiv\s*=\s*["']?\s*content-type["'][^>]*content\s*=\s*["']([^"']+)["']/i,
  );
  if (m?.[1]) {
    const inner = m[1].match(/charset\s*=\s*([^;"'\s]+)/i);
    if (inner?.[1]) return inner[1];
  }

  m = htmlLatin1Head.match(
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*http-equiv\s*=\s*["']?\s*content-type/i,
  );
  if (m?.[1]) {
    const inner = m[1].match(/charset\s*=\s*([^;"'\s]+)/i);
    if (inner?.[1]) return inner[1];
  }

  return null;
}

function stripBom(bytes: Uint8Array): { payload: Uint8Array; bomUtf8: boolean } {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return { payload: bytes.subarray(3), bomUtf8: true };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { payload: bytes.subarray(2), bomUtf8: false };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { payload: bytes.subarray(2), bomUtf8: false };
  }
  return { payload: bytes, bomUtf8: false };
}

/**
 * 按 HTTP 头与 HTML meta 声明解码正文，避免 GBK/Big5 等被误当 UTF-8 造成乱码。
 */
export function decodeResponseBody(buf: ArrayBuffer, rawContentType: string): string {
  const bytes = new Uint8Array(buf);
  const { payload, bomUtf8 } = stripBom(bytes);

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(payload);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(payload);
  }
  if (bomUtf8) {
    return new TextDecoder("utf-8", { fatal: false }).decode(payload);
  }

  const ctLower = (rawContentType ?? "").toLowerCase();
  let charset = parseCharsetFromContentType(rawContentType ?? "");

  const looksHtml =
    ctLower.includes("text/html") || ctLower.includes("application/xhtml");

  if (!charset && looksHtml) {
    const peekLen = Math.min(payload.length, 24576);
    const bufPeek = Buffer.from(payload.buffer, payload.byteOffset, peekLen);
    const latin1Head = bufPeek.toString("latin1");
    charset = sniffHtmlCharset(latin1Head);
  }

  if (!charset) {
    charset = "utf-8";
  }

  const encoding = normalizeEncodingLabel(charset);

  if (encoding === "utf-8") {
    return new TextDecoder("utf-8", { fatal: false }).decode(payload);
  }

  try {
    if (iconv.encodingExists(encoding)) {
      const nodeBuf = Buffer.from(
        payload.buffer,
        payload.byteOffset,
        payload.byteLength,
      );
      return iconv.decode(nodeBuf, encoding);
    }
  } catch {
    /* fallback utf-8 */
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(payload);
}
