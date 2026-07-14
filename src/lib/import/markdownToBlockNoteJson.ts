import { BlockNoteEditor } from "@blocknote/core";

/**
 * Converts Markdown to the JSON string format stored in Convex (`documents.content`).
 */
export function markdownToBlockNoteJson(markdown: string): string {
  const editor = BlockNoteEditor.create();
  const trimmed = markdown.trim();
  const blocks = editor.tryParseMarkdownToBlocks(
    trimmed.length > 0 ? markdown : "\n",
  );
  if (blocks.length === 0) {
    return JSON.stringify([{ type: "paragraph" }], null, 2);
  }
  return JSON.stringify(blocks, null, 2);
}

/**
 * 将 HTML 转为 BlockNote JSON。保留 img、h1–h3、列表等，优于「HTML→Markdown→Blocks」链路（懒加载图易丢失）。
 * 仅在浏览器中使用（与 Markdown 路径一致）。
 */
export function htmlToBlockNoteJson(html: string): string {
  const editor = BlockNoteEditor.create();
  const trimmed = html.trim();
  const blocks = editor.tryParseHTMLToBlocks(
    trimmed.length > 0 ? trimmed : "<p></p>",
  );
  if (blocks.length === 0) {
    return JSON.stringify([{ type: "paragraph" }], null, 2);
  }
  return JSON.stringify(blocks, null, 2);
}
