import { fetchGithubDefaultBranchReadme } from "./githubReadme";
import {
  extractGithubRepoFromRepoPageUrl,
  looksLikeGithubRepoLandingHtml,
} from "./githubPaths";
import { isLikelyHtmlDocument } from "./htmlMarkdown";

import type { FetchedPage } from "./types";

/**
 * 若仍拿到 GitHub 仓库「落地页」整站 HTML，则改抓 README。
 */
export async function recoverGithubReadmeIfLandingPage(
  fetched: FetchedPage,
  options: { skip: boolean },
): Promise<FetchedPage> {
  if (options.skip) return fetched;

  if (
    !looksLikeGithubRepoLandingHtml(fetched.body) ||
    !isLikelyHtmlDocument(fetched.body, fetched.contentType)
  ) {
    return fetched;
  }

  const repoIds = extractGithubRepoFromRepoPageUrl(fetched.finalUrl);
  if (!repoIds) return fetched;

  try {
    return await fetchGithubDefaultBranchReadme(repoIds.owner, repoIds.repo);
  } catch {
    return fetched;
  }
}
