import {
  htmlPlainTextHint,
  prepareArticleHtmlForBlockNote,
} from "../normalizeImportHtml";
import { rehostWechatImagesInHtml } from "../wechatRehostImages";
import { extractWechatMpArticleFromHtml } from "../wechatMpImport";

import {
  extractTitleFromHtml,
  htmlToMarkdown,
  responseToMarkdown,
  titleFromPathname,
  isLikelyHtmlDocument,
} from "./htmlMarkdown";

import { matchesWechatMpHost } from "./constants";
import type { FetchedPage, UrlImportPayload } from "./types";
import { safeHostnameLower, safePathname } from "./urlParsing";

function markdownAndTitleFromGenericFetch(
  fetched: FetchedPage,
  pathnameForHints: string,
): { markdown: string; suggestedTitle: string | undefined } {
  const markdown = responseToMarkdown(
    fetched.body,
    fetched.contentType,
    pathnameForHints,
  );
  let suggestedTitle = titleFromPathname(pathnameForHints);
  if (isLikelyHtmlDocument(fetched.body, fetched.contentType)) {
    suggestedTitle = extractTitleFromHtml(fetched.body) ?? suggestedTitle;
  }
  return { markdown, suggestedTitle };
}

function stripWeakImportHtml(importHtml: string | undefined): string | undefined {
  if (!importHtml) return undefined;
  const htmlImportable =
    /<img\b/i.test(importHtml) || htmlPlainTextHint(importHtml).length >= 12;
  return htmlImportable ? importHtml : undefined;
}

type RichOrMarkdownPayload = {
  markdown: string;
  importHtml?: string;
  suggestedTitle: string | undefined;
};

/** 仅当最终页为公众号域名且能抽到正文区块时返回富文本分支结果，否则交给通用 Markdown 管线。 */
async function tryWechatMpRichPayload(
  fetched: FetchedPage,
  pathnameForHints: string,
  hostnameLower: string,
): Promise<RichOrMarkdownPayload | null> {
  if (!matchesWechatMpHost(hostnameLower)) return null;

  const extracted = extractWechatMpArticleFromHtml(fetched.body);
  if (!extracted?.articleHtml.trim()) return null;

  const prepared = prepareArticleHtmlForBlockNote(extracted.articleHtml, {
    wechat: true,
  });
  const withRehostedImages = await rehostWechatImagesInHtml(
    prepared,
    fetched.finalUrl,
  );
  const importHtml = `<article>${withRehostedImages}</article>`;
  const markdown = htmlToMarkdown(importHtml);
  const suggestedTitle =
    extracted.title?.trim() ||
    extractTitleFromHtml(fetched.body) ||
    titleFromPathname(pathnameForHints);

  return { markdown, importHtml, suggestedTitle };
}

/**
 * 将抓取结果转为导入 API 载荷（Markdown + 可选富文本 HTML）。
 */
export async function composeUrlImportPayload(
  fetched: FetchedPage,
  parsedOriginalUrl: URL,
): Promise<UrlImportPayload> {
  const pathnameForHints = safePathname(
    fetched.finalUrl,
    parsedOriginalUrl.pathname,
  );
  const hostnameLower = safeHostnameLower(fetched.finalUrl);

  const wechatRich = await tryWechatMpRichPayload(
    fetched,
    pathnameForHints,
    hostnameLower,
  );

  let markdown: string;
  let suggestedTitle: string | undefined;
  let importHtml: string | undefined;

  if (wechatRich) {
    ({ markdown, suggestedTitle, importHtml } = wechatRich);
  } else {
    ({ markdown, suggestedTitle } = markdownAndTitleFromGenericFetch(
      fetched,
      pathnameForHints,
    ));
    importHtml = undefined;
  }

  importHtml = stripWeakImportHtml(importHtml);

  const payloadMarkdown = markdown.trim() || "\n";

  return {
    markdown: payloadMarkdown,
    suggestedTitle: suggestedTitle ?? null,
    ...(importHtml ? { importHtml } : {}),
  };
}
