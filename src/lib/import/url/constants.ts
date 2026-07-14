export const FETCH_TIMEOUT_MS = 15_000;

/** 微信公众号文章域名（抓取 / 验证页 / 正文组装共用） */
export const WECHAT_MP_HOST = "mp.weixin.qq.com";

/** GitHub raw 域名（与 `githubPaths` 中构造的 URL 一致） */
export const GITHUB_RAW_HOST = "raw.githubusercontent.com";

/** `hostname` 可为任意大小写；已与 `safeHostnameLower` 结果比较时同样适用。 */
export function matchesWechatMpHost(hostname: string): boolean {
  return hostname.toLowerCase() === WECHAT_MP_HOST;
}
