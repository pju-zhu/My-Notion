import { tryFetchGithubReadmeViaRestApi } from "../githubReadmeApi";

import { fetchUrlBody } from "./fetchGeneric";
import { stripDotGitSegment } from "./githubPaths";
import { parseAndAssertSafeUrl } from "./safeUrl";

import type { FetchedPage } from "./types";

/** 抓取仓库默认分支 README：优先 GitHub REST（默认分支），失败则 raw main → master。 */
export async function fetchGithubDefaultBranchReadme(
  owner: string,
  repo: string,
): Promise<FetchedPage> {
  const strippedRepo = stripDotGitSegment(repo);
  const apiMd = await tryFetchGithubReadmeViaRestApi(owner, strippedRepo);
  if (apiMd !== null) {
    const canonical = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(strippedRepo)}`;
    return {
      body: apiMd,
      contentType: "text/markdown; charset=utf-8",
      finalUrl: canonical,
    };
  }

  const safeOwner = encodeURIComponent(owner);
  const safeRepo = encodeURIComponent(strippedRepo);
  const mainUrl = parseAndAssertSafeUrl(
    `https://raw.githubusercontent.com/${safeOwner}/${safeRepo}/main/README.md`,
  );
  try {
    return await fetchUrlBody(mainUrl);
  } catch (e) {
    if (e instanceof Error && e.message === "FETCH_HTTP_404") {
      const masterUrl = parseAndAssertSafeUrl(
        `https://raw.githubusercontent.com/${safeOwner}/${safeRepo}/master/README.md`,
      );
      return await fetchUrlBody(masterUrl);
    }
    throw e;
  }
}
