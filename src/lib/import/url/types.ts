/** 远程抓取后的原始页 */
export type FetchedPage = {
  body: string;
  contentType: string;
  finalUrl: string;
};

/** `/api/import/url` 成功响应体 */
export type UrlImportPayload = {
  markdown: string;
  suggestedTitle: string | null;
  importHtml?: string;
};

export type UrlImportOutcome =
  | { ok: true; payload: UrlImportPayload }
  | { ok: false; status: number; json: Record<string, unknown> };
