import { IMPORT_URL_JSON_CODE_WECHAT_VERIFICATION } from "../importUrlCodes";

import { WECHAT_MP_HOST } from "./constants";
import type { UrlImportOutcome } from "./types";

function wechatCookieHint(): string | undefined {
  if (process.env.WECHAT_MP_FETCH_COOKIE?.trim()) return undefined;
  return `Self-hosted: set env WECHAT_MP_FETCH_COOKIE to a fresh Cookie header value from a browser session that can open this article on ${WECHAT_MP_HOST} (must be rotated when it expires).`;
}

/** 微信返回验证页时的统一 API 结构（`code` 与 `importUrlCodes` 及客户端解析器一致）。 */
export function wechatVerificationOutcome(): UrlImportOutcome {
  return {
    ok: false,
    status: 422,
    json: {
      code: IMPORT_URL_JSON_CODE_WECHAT_VERIFICATION,
      error:
        "WeChat returned a verification page instead of the article body.",
      hint: wechatCookieHint(),
    },
  };
}
