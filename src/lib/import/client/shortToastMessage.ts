/** 单行截断，避免 toast 过长。 */
export function shortToastMessage(message: string, maxLen = 96): string {
  const line = message.split(/\r?\n/)[0]?.trim() ?? message;
  if (line.length <= maxLen) return line;
  return `${line.slice(0, Math.max(0, maxLen - 1))}…`;
}
