import type { UrlImportPayload } from "./types";

export function isUrlImportPayloadEmpty(payload: UrlImportPayload): boolean {
  const hasHtml = Boolean(payload.importHtml?.trim());
  const hasMd = Boolean(payload.markdown.trim());
  return !hasMd && !hasHtml;
}
