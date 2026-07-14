import { matchesWechatMpHost } from "./constants";

/**
 * 微信公众平台文章：服务端 fetch 常被判定为「异常环境」，返回验证页而非正文。
 */
export function isWechatMpVerificationWall(
  body: string,
  hostname: string,
): boolean {
  if (!matchesWechatMpHost(hostname)) return false;

  if (
    body.includes("appmsgcaptcha") ||
    body.includes("wappoc_appmsgcaptcha") ||
    body.includes("mmbizwap:secitptpage/verify") ||
    body.includes("secitptpage/verify.html")
  ) {
    return true;
  }
  if (body.includes("环境异常") && body.includes("完成验证")) {
    return true;
  }
  if (body.includes("当前环境异常") && body.includes("验证")) {
    return true;
  }

  return false;
}
