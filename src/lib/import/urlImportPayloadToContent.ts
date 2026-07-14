import type { ImportUrlSuccessPayload } from "@/src/lib/import/client";

import {
  htmlToBlockNoteJson,
  markdownToBlockNoteJson,
} from "./markdownToBlockNoteJson";

/** URL 导入 API 成功载荷 → 存入 Convex 的 BlockNote JSON 字符串。 */
export function blockNoteContentFromUrlPayload(
  payload: ImportUrlSuccessPayload,
): string {
  return payload.importHtml !== undefined
    ? htmlToBlockNoteJson(payload.importHtml)
    : markdownToBlockNoteJson(payload.markdown);
}
