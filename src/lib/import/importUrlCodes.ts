/**
 * `/api/import/url` 与客户端解析器共用的 JSON 字段约定（无服务端依赖，可被 client bundle 引用）。
 */

export const IMPORT_URL_JSON_CODE_WECHAT_VERIFICATION =
  "WECHAT_MP_VERIFICATION" as const;

export const IMPORT_URL_JSON_CODE_BODY_TOO_LARGE = "BODY_TOO_LARGE" as const;
