"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import type { ImportSourceTab } from "@/src/lib/import/importNoteUi";
import { api } from "@/convex/_generated/api";
import {
  requestUrlImportPayload,
  shortToastMessage,
} from "@/src/lib/import/client";
import {
  ImportMarkdownInvalidExtError,
  readLocalMarkdownForImport,
} from "@/src/lib/import/readLocalMarkdownForImport";
import { blockNoteContentFromUrlPayload } from "@/src/lib/import/urlImportPayloadToContent";

/**
 * 导入笔记领域逻辑：对话框状态 + 本地 MD / URL 管线 + 调用 Convex 创建文档。
 * 需在 {@link ImportNoteProvider} 下单例使用；对外请用同目录 provider 导出的 `useImportNote`。
 */
export function useImportNoteController() {
  const router = useRouter();
  const create = useMutation(api.documents.create);
  const t = useTranslations("Documents");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const persistingRef = useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<ImportSourceTab>("file");

  const toastImportError = useCallback(
    (err: unknown) => {
      toast.error(
        shortToastMessage(
          err instanceof Error ? err.message : t("importFailed"),
        ),
      );
    },
    [t],
  );

  const persistImportedDocument = useCallback(
    async (titleCandidate: string, content: string) => {
      if (persistingRef.current) return;
      persistingRef.current = true;
      try {
        const title = titleCandidate.trim() || t("untitled");
        const documentId = await create({ title, content });
        router.push(`/documents/${documentId}`);
        setDialogOpen(false);
      } finally {
        persistingRef.current = false;
      }
    },
    [create, router, t],
  );

  const openImportDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;

      try {
        const { title, content } = await readLocalMarkdownForImport(file);
        await persistImportedDocument(title, content);
      } catch (err) {
        if (err instanceof ImportMarkdownInvalidExtError) {
          toast.error(t("importInvalidType"));
          return;
        }
        toastImportError(err);
      }
    },
    [persistImportedDocument, t, toastImportError],
  );

  const submitUrlImport = useCallback(
    async (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return;

      try {
        const payload = await requestUrlImportPayload(trimmed, {
          bodyTooLarge: (mb) => t("importUrlBodyTooLarge", { mb }),
          bodyTooLargeLegacy: t("importUrlBodyTooLargeLegacy"),
          wechatMpBlocked: t("importUrlWechatMpBlocked"),
          genericFailed: t("importFailed"),
        });
        const content = blockNoteContentFromUrlPayload(payload);
        const titleCandidate = payload.suggestedTitle ?? "";
        await persistImportedDocument(titleCandidate, content);
      } catch (err) {
        toastImportError(err);
      }
    },
    [persistImportedDocument, t, toastImportError],
  );

  return {
    dialogOpen,
    setDialogOpen,
    tab,
    setTab,
    openImportDialog,
    openFilePicker,
    fileInputRef,
    onFileChange,
    submitUrlImport,
  };
}
