export type ImportUrlSuccessPayload = {
  markdown: string;
  suggestedTitle: string | null;
  importHtml?: string;
};

/** 校验 `/api/import/url` 200 响应结构，避免异常 JSON 进入编辑器管线。 */
export function parseImportUrlSuccessBody(
  data: unknown,
): ImportUrlSuccessPayload | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.markdown !== "string") return null;

  let suggestedTitle: string | null = null;
  if (o.suggestedTitle === null || o.suggestedTitle === undefined) {
    suggestedTitle = null;
  } else if (typeof o.suggestedTitle === "string") {
    suggestedTitle = o.suggestedTitle;
  } else {
    return null;
  }

  const importHtml =
    typeof o.importHtml === "string" && o.importHtml.trim().length > 0
      ? o.importHtml
      : undefined;

  return { markdown: o.markdown, suggestedTitle, importHtml };
}
