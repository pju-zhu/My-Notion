/**
 * 导入前 HTML 规范化（无 DOM，可在服务端或客户端使用）。
 * 微信等站点常用 data-src 懒加载，BlockNote / Turndown 只认 img[src]。
 */

function absolutizeUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function readHtmlAttr(tag: string, name: string): string {
  const re = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i");
  const m = tag.match(re);
  return m?.[2]?.trim() ?? "";
}

/**
 * 将懒加载图片的 data-src / data-original 等合并为可用的 src（https）。
 */
export function normalizeLazyImagesInHtml(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const dataSrc =
      readHtmlAttr(tag, "data-src") ||
      readHtmlAttr(tag, "data-original") ||
      readHtmlAttr(tag, "data-backsrc");
    let realUrl = absolutizeUrl(dataSrc);
    if (!realUrl || !/^https?:\/\//i.test(realUrl)) {
      const src = readHtmlAttr(tag, "src");
      const fixed = absolutizeUrl(src);
      if (fixed.startsWith("http")) {
        if (/\bsrc\s*=/i.test(tag)) {
          return tag.replace(
            /\bsrc\s*=\s*(["'])([\s\S]*?)\1/i,
            ` src="${fixed}"`,
          );
        }
        return tag.replace(/<img\b/i, `<img src="${fixed}" `);
      }
      return tag;
    }

    if (/\bsrc\s*=/i.test(tag)) {
      return tag.replace(
        /\bsrc\s*=\s*(["'])([\s\S]*?)\1/i,
        ` src="${realUrl}"`,
      );
    }
    return tag.replace(/<img\b/i, `<img src="${realUrl}" `);
  });
}

/**
 * BlockNote HTML 解析对 section 支持不稳定，改为 div 更安全。
 */
export function normalizeSectionTagsForImport(html: string): string {
  return html
    .replace(/<section\b/gi, "<div")
    .replace(/<\/section>/gi, "</div>");
}

export function stripNoiseWrappersForImport(html: string): string {
  return html
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

export function htmlPlainTextHint(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 去掉公众号正文里重复的标题块（常用字体混淆）、作者卡片等，避免编辑器首行乱码或与文档标题重复。
 */
export function stripWechatEditorNoiseFromFragment(html: string): string {
  let h = html;
  h = h.replace(/<div[^>]*profile_container[^>]*>[\s\S]*?<\/div>/gi, "");
  h = h.replace(/<div[^>]*js_profile_card[^>]*>[\s\S]*?<\/div>/gi, "");
  h = h.replace(/<div[^>]*rich_media_meta[^>]*>[\s\S]*?<\/div>/gi, "");
  h = h.replace(/<h1[^>]*rich_media_title[^>]*>[\s\S]*?<\/h1>/gi, "");
  h = h.replace(/<h2[^>]*rich_media_title[^>]*>[\s\S]*?<\/h2>/gi, "");
  h = h.replace(
    /<div[^>]*id\s*=\s*["']activity-name["'][^>]*>[\s\S]*?<\/div>/gi,
    "",
  );
  return h;
}

export type PrepareArticleHtmlOptions = {
  /** 微信公众号 #js_content 内片段：去标题噪声 */
  wechat?: boolean;
};

/** 用于导入的完整正文预处理（图片 + 块标签 + 常见噪音）。 */
export function prepareArticleHtmlForBlockNote(
  fragment: string,
  options?: PrepareArticleHtmlOptions,
): string {
  let h = stripNoiseWrappersForImport(fragment);
  h = normalizeLazyImagesInHtml(h);
  h = normalizeSectionTagsForImport(h);
  if (options?.wechat) {
    h = stripWechatEditorNoiseFromFragment(h);
  }
  return h.trim();
}
