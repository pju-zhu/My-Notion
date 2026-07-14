/** github.com 上非「用户/仓库」的顶层路径，避免误判为仓库根 */
const GITHUB_NON_REPO_ROOT_SEGMENTS = new Set([
  "settings",
  "orgs",
  "team",
  "enterprise",
  "explore",
  "marketplace",
  "pricing",
  "features",
  "sponsors",
  "topics",
  "notifications",
  "login",
  "signup",
  "sessions",
  "account",
  "dashboard",
  "copilot",
  "community",
  "customer-stories",
  "resources",
  "pulls",
  "issues",
  "codespaces",
]);

export function stripDotGitSegment(repo: string): string {
  return repo.replace(/\.git$/i, "");
}

function normalizeGithubPathname(pathname: string): string {
  return pathname.replace(/\/+/g, "/").replace(/\/+$/, "") || "/";
}

/**
 * 匹配「仓库根」路径：支持可选语言前缀 `/ja/owner/repo`，以及 `/owner/repo.git`。
 */
export function matchGithubOwnerRepoRoot(pathname: string): {
  owner: string;
  repoSeg: string;
} | null {
  const path = normalizeGithubPathname(pathname);
  const m = path.match(
    /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?([^/]+)\/([^/]+)$/,
  );
  if (!m) return null;
  const owner = m[1];
  const repoSeg = m[2];
  if (GITHUB_NON_REPO_ROOT_SEGMENTS.has(owner.toLowerCase())) return null;
  return { owner, repoSeg };
}

/** 判定是否为 GitHub 仓库落地页 HTML（而非 README raw、非营销页） */
export function looksLikeGithubRepoLandingHtml(body: string): boolean {
  const head = body.slice(0, 120_000);
  return (
    body.includes("octolytics-dimension-repository") ||
    head.includes(`"@type":"Repository"`) ||
    body.includes('data-testid="repository-container-header"') ||
    (head.includes("application/ld+json") &&
      /"type"\s*:\s*"repository"/i.test(head))
  );
}

/** 从 github.com 最终 URL 解析 owner/repo（用于补救抓取） */
export function extractGithubRepoFromRepoPageUrl(
  finalUrlStr: string,
): { owner: string; repo: string } | null {
  try {
    const u = new URL(finalUrlStr);
    const host = u.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") return null;
    const matched = matchGithubOwnerRepoRoot(u.pathname);
    if (!matched) return null;
    return {
      owner: matched.owner,
      repo: stripDotGitSegment(matched.repoSeg),
    };
  } catch {
    return null;
  }
}

/**
 * 将 github.com 仓库根 / blob / tree 链接转为 raw.githubusercontent.com。
 */
export function rewriteGithubToRawUrl(url: URL): URL | null {
  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") return null;

  const path = normalizeGithubPathname(url.pathname);

  const blob = path.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  if (blob) {
    const [, owner, repo, ref, filePath] = blob;
    return new URL(
      `https://raw.githubusercontent.com/${owner}/${stripDotGitSegment(repo)}/${ref}/${filePath}`,
    );
  }

  const tree = path.match(/^\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.*))?$/);
  if (tree) {
    const [, owner, repo, ref, rest] = tree;
    const filePath = rest && rest.length > 0 ? rest : "README.md";
    return new URL(
      `https://raw.githubusercontent.com/${owner}/${stripDotGitSegment(repo)}/${ref}/${filePath}`,
    );
  }

  const root = matchGithubOwnerRepoRoot(path);
  if (root) {
    const repo = stripDotGitSegment(root.repoSeg);
    return new URL(
      `https://raw.githubusercontent.com/${root.owner}/${repo}/main/README.md`,
    );
  }

  return null;
}
