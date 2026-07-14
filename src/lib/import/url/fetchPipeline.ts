import { fetchWechatMpUrl } from "../wechatMpImport";

import { GITHUB_RAW_HOST, matchesWechatMpHost } from "./constants";
import { fetchUrlBody } from "./fetchGeneric";
import { fetchGithubDefaultBranchReadme } from "./githubReadme";
import {
  matchGithubOwnerRepoRoot,
  rewriteGithubToRawUrl,
} from "./githubPaths";
import { parseAndAssertSafeUrl } from "./safeUrl";

import type { FetchedPage } from "./types";

async function fetchUrlBodyWithGithubReadme404Fallback(
  fetchTarget: URL,
  triedDefaultMainReadme: boolean,
): Promise<FetchedPage> {
  try {
    return await fetchUrlBody(fetchTarget);
  } catch (first) {
    if (
      first instanceof Error &&
      first.message === "FETCH_HTTP_404" &&
      triedDefaultMainReadme
    ) {
      const masterUrl = new URL(fetchTarget.toString());
      masterUrl.pathname = masterUrl.pathname.replace(
        /\/main\/README\.md$/i,
        "/master/README.md",
      );
      return await fetchUrlBody(parseAndAssertSafeUrl(masterUrl.toString()));
    }
    throw first;
  }
}

/**
 * 按 URL 类型选择抓取策略（微信 / GitHub 仓库根 / 通用）。
 */
export async function fetchUrlImportPage(parsedUrl: URL): Promise<FetchedPage> {
  const isWechatMpHost = matchesWechatMpHost(parsedUrl.hostname);

  const githubRaw = rewriteGithubToRawUrl(parsedUrl);
  const fetchTarget = githubRaw
    ? parseAndAssertSafeUrl(githubRaw.toString())
    : parsedUrl;

  const triedDefaultMainReadme =
    githubRaw !== null &&
    fetchTarget.hostname === GITHUB_RAW_HOST &&
    /\/main\/README\.md$/i.test(fetchTarget.pathname);

  const repoRootMatch = matchGithubOwnerRepoRoot(parsedUrl.pathname);

  if (isWechatMpHost) {
    return fetchWechatMpUrl(parsedUrl);
  }

  if (repoRootMatch && githubRaw !== null) {
    try {
      return await fetchGithubDefaultBranchReadme(
        repoRootMatch.owner,
        repoRootMatch.repoSeg,
      );
    } catch {
      return fetchUrlBodyWithGithubReadme404Fallback(
        fetchTarget,
        triedDefaultMainReadme,
      );
    }
  }

  return fetchUrlBodyWithGithubReadme404Fallback(
    fetchTarget,
    triedDefaultMainReadme,
  );
}
