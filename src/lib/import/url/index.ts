/**
 * URL 导入领域模块（服务端）。
 * 编排入口：{@link runUrlImport}；HTTP 映射：{@link urlImportExceptionToResponse}。
 */

export type {
  FetchedPage,
  UrlImportOutcome,
  UrlImportPayload,
} from "./types";

export {
  decodeResponseBody,
  normalizeEncodingLabel,
  parseCharsetFromContentType,
  sniffHtmlCharset,
} from "./decodeBody";

export { fetchUrlBody } from "./fetchGeneric";
export { getMaxUrlImportBodyBytes } from "./limits";

export {
  extractGithubRepoFromRepoPageUrl,
  looksLikeGithubRepoLandingHtml,
  matchGithubOwnerRepoRoot,
  rewriteGithubToRawUrl,
  stripDotGitSegment,
} from "./githubPaths";

export { fetchGithubDefaultBranchReadme } from "./githubReadme";

export {
  extractTitleFromHtml,
  htmlToMarkdown,
  isLikelyHtmlDocument,
  responseToMarkdown,
  titleFromPathname,
} from "./htmlMarkdown";

export { isWechatMpVerificationWall } from "./wechatVerification";

export { isBlockedUrlHost, parseAndAssertSafeUrl } from "./safeUrl";

export { fetchUrlImportPage } from "./fetchPipeline";
export { recoverGithubReadmeIfLandingPage } from "./recoverGithubLanding";
export { composeUrlImportPayload } from "./composeImportPayload";
export { runUrlImport } from "./runUrlImport";
export { urlImportExceptionToResponse } from "./handleImportUrlException";
