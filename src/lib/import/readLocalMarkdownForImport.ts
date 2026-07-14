import { markdownToBlockNoteJson } from "./markdownToBlockNoteJson";

const MD_EXT = /\.(md|markdown)$/i;

/** 用户选择了非 .md 扩展名时抛出，由 UI 层映射为文案。 */
export class ImportMarkdownInvalidExtError extends Error {
  constructor() {
    super("IMPORT_MARKDOWN_INVALID_EXT");
    this.name = "ImportMarkdownInvalidExtError";
  }
}

/**
 * 读取本地 Markdown 文件为 BlockNote 存储用 JSON 字符串与建议标题（不含文件名兜底）。
 */
export async function readLocalMarkdownForImport(
  file: File,
): Promise<{ title: string; content: string }> {
  if (!MD_EXT.test(file.name)) {
    throw new ImportMarkdownInvalidExtError();
  }
  const text = await file.text();
  const content = markdownToBlockNoteJson(text);
  const title = file.name.replace(MD_EXT, "").trim();
  return { title, content };
}
