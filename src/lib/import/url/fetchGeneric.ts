import { IMPORT_URL_JSON_CODE_BODY_TOO_LARGE } from "../importUrlCodes";

import { FETCH_TIMEOUT_MS } from "./constants";
import { decodeResponseBody } from "./decodeBody";
import { getMaxUrlImportBodyBytes } from "./limits";
import { assertSafeFetchedFinalUrl } from "./safeUrl";

import type { FetchedPage } from "./types";

export async function fetchUrlBody(parsed: URL): Promise<FetchedPage> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "NotionImportBot/1.0 (+https://github.com; markdown/url import)",
        Accept: "text/html,text/plain,text/markdown,*/*;q=0.1",
      },
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
    const contentType = rawContentType.toLowerCase();

    const body = decodeResponseBody(buf, rawContentType);
    const finalUrl = res.url || parsed.toString();
    return { body, contentType, finalUrl };
  } finally {
    clearTimeout(t);
  }
}
