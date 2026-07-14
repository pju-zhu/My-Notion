import { composeUrlImportPayload } from "./composeImportPayload";
import { matchesWechatMpHost } from "./constants";
import { fetchUrlImportPage } from "./fetchPipeline";
import { isUrlImportPayloadEmpty } from "./importPayloadGuards";
import { recoverGithubReadmeIfLandingPage } from "./recoverGithubLanding";
import { parseAndAssertSafeUrl } from "./safeUrl";
import type { UrlImportOutcome } from "./types";
import { safeHostnameLower } from "./urlParsing";
import { wechatVerificationOutcome } from "./wechatImportResponse";
import { isWechatMpVerificationWall } from "./wechatVerification";

/**
 * URL 导入编排入口：抓取 → GitHub 补救 → 微信验证 → 组装载荷。
 * URL 校验与网络错误仍通过 throw Error(code) 交由 HTTP 层映射。
 */
export async function runUrlImport(rawUrl: string): Promise<UrlImportOutcome> {
  const parsedUrl = parseAndAssertSafeUrl(rawUrl);
  const isWechatMpHost = matchesWechatMpHost(parsedUrl.hostname);

  let fetched = await fetchUrlImportPage(parsedUrl);

  fetched = await recoverGithubReadmeIfLandingPage(fetched, {
    skip: isWechatMpHost,
  });

  const hostname = safeHostnameLower(fetched.finalUrl);

  if (isWechatMpVerificationWall(fetched.body, hostname)) {
    return wechatVerificationOutcome();
  }

  const payload = await composeUrlImportPayload(fetched, parsedUrl);

  if (isUrlImportPayloadEmpty(payload)) {
    return {
      ok: false,
      status: 422,
      json: { error: "No importable text was found at this URL" },
    };
  }

  return { ok: true, payload };
}
