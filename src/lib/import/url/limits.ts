const DEFAULT_MAX_URL_IMPORT_BYTES = 16 * 1024 * 1024;
const MIN_URL_IMPORT_BYTES = 512 * 1024;
const HARD_CAP_URL_IMPORT_BYTES = 32 * 1024 * 1024;

/**
 * 远程页面下载体积上限。默认 16MB；可通过环境变量 MAX_URL_IMPORT_BYTES 覆盖（512KB–32MB）。
 */
export function getMaxUrlImportBodyBytes(): number {
  const raw = process.env.MAX_URL_IMPORT_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_URL_IMPORT_BYTES;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_URL_IMPORT_BYTES;
  return Math.min(
    Math.max(parsed, MIN_URL_IMPORT_BYTES),
    HARD_CAP_URL_IMPORT_BYTES,
  );
}
