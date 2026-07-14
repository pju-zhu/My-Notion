import { IMPORT_URL_JSON_CODE_WECHAT_VERIFICATION } from "../importUrlCodes";

export type ImportUrlFailureMessages = {
  bodyTooLarge: (mb: number) => string;
  bodyTooLargeLegacy: string;
  wechatMpBlocked: string;
  genericFailed: string;
};

/**
 * 将 `/api/import/url` 失败响应映射为可展示的 Error（与 Convex / UI 无关）。
 */
export function interpretImportUrlFailure(
  status: number,
  data: Record<string, unknown>,
  messages: ImportUrlFailureMessages,
): Error {
  if (status === 413) {
    const raw = data.maxBytes as number | undefined;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      const mb = Math.max(1, Math.round(raw / (1024 * 1024)));
      return new Error(messages.bodyTooLarge(mb));
    }
    return new Error(messages.bodyTooLargeLegacy);
  }
  if (data.code === IMPORT_URL_JSON_CODE_WECHAT_VERIFICATION) {
    return new Error(messages.wechatMpBlocked);
  }
  const msg =
    typeof data.error === "string" ? data.error : messages.genericFailed;
  return new Error(msg);
}
