"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import { useImportNoteController } from "@/src/hooks/use-import-note";

import { ImportNoteDialog } from "./ImportNoteDialog";

type ImportNoteContextValue = ReturnType<typeof useImportNoteController>;

const ImportNoteContext = createContext<ImportNoteContextValue | null>(null);

/**
 * 在布局层单例挂载导入状态与对话框，避免侧边栏与文档页各持一份 `useImportNote` 导致状态分裂。
 */
export function ImportNoteProvider({ children }: { children: ReactNode }) {
  const importNote = useImportNoteController();

  return (
    <ImportNoteContext.Provider value={importNote}>
      {children}
      <ImportNoteDialog controller={importNote} />
    </ImportNoteContext.Provider>
  );
}

export function useImportNote(): ImportNoteContextValue {
  const ctx = useContext(ImportNoteContext);
  if (!ctx) {
    throw new Error("useImportNote must be used within ImportNoteProvider");
  }
  return ctx;
}
