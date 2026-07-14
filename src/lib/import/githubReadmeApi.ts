/**
 * 通过 GitHub REST API 拉取仓库默认分支 README 原文（无需登录，公开仓可用）。
 * 与 URL fetch / Turndown 解耦，避免依赖 raw.githubusercontent.com 分支猜测。
 * @see https://docs.github.com/en/rest/repos/repos#get-a-repository-readme
 */

const README_ACCEPT = "application/vnd.github.raw";

export async function tryFetchGithubReadmeViaRestApi(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const cleanRepo = repo.replace(/\.git$/i, "");
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(cleanRepo)}/readme`;

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: signal ?? AbortSignal.timeout(15_000),
      headers: {
        Accept: README_ACCEPT,
        "User-Agent": "My-Notion-URLImport/1.0 (public readme)",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!res.ok) return null;

    const text = await res.text();
    return text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
}
