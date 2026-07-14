import type { ImportUrlFailureMessages } from "./interpretImportUrlFailure";
import { interpretImportUrlFailure } from "./interpretImportUrlFailure";
import {
  parseImportUrlSuccessBody,
  type ImportUrlSuccessPayload,
} from "./parseImportUrlSuccessBody";

/** 与 Next route 路径一致；集中一处便于替换或测试注入。 */
export const IMPORT_URL_API_PATH = "/api/import/url";

/**
 * 调用 URL 导入 API，返回解析后的载荷（不含 Convex / BlockNote 转换）。
 */
export async function requestUrlImportPayload(
  url: string,
  messages: ImportUrlFailureMessages,
): Promise<ImportUrlSuccessPayload> {
  const res = await fetch(IMPORT_URL_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!res.ok) {
    throw interpretImportUrlFailure(res.status, data, messages);
  }
  const payload = parseImportUrlSuccessBody(data);
  if (!payload) {
    throw new Error(messages.genericFailed);
  }
  return payload;
}
