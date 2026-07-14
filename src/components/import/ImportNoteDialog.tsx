"use client";

import { useEffect, useState } from "react";
import { FileUp } from "lucide-react";
import { useTranslations } from "next-intl";

import type { useImportNoteController } from "@/src/hooks/use-import-note";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";

type ImportNoteController = ReturnType<typeof useImportNoteController>;

interface ImportNoteDialogProps {
  controller: ImportNoteController;
}

export function ImportNoteDialog({ controller }: ImportNoteDialogProps) {
  const {
    dialogOpen: open,
    setDialogOpen: onOpenChange,
    tab,
    setTab: onTabChange,
    fileInputRef,
    onFileChange,
    openFilePicker,
    submitUrlImport,
  } = controller;
  const t = useTranslations("Documents");
  const [url, setUrl] = useState("");
  const [urlSubmitting, setUrlSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setUrl("");
      setUrlSubmitting(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("importNoteTitle")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("importNoteSubtitle")}
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex rounded-md border border-border bg-muted/40 p-1 gap-1"
          role="tablist"
          aria-label={t("importNoteTitle")}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "flex-1 font-normal text-muted-foreground hover:bg-primary/5 hover:text-foreground",
              tab === "file" &&
                "bg-background text-foreground shadow-sm hover:bg-background",
            )}
            onClick={() => onTabChange("file")}
            role="tab"
            aria-selected={tab === "file"}
          >
            {t("importTabFile")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "flex-1 font-normal text-muted-foreground hover:bg-primary/5 hover:text-foreground",
              tab === "url" &&
                "bg-background text-foreground shadow-sm hover:bg-background",
            )}
            onClick={() => onTabChange("url")}
            role="tab"
            aria-selected={tab === "url"}
          >
            {t("importTabUrl")}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown"
          className="hidden"
          onChange={onFileChange}
        />

        {tab === "file" ? (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={openFilePicker}
            >
              <FileUp className="w-4 h-4" />
              {t("importChooseFile")}
            </Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setUrlSubmitting(true);
              try {
                await submitUrlImport(url);
              } finally {
                setUrlSubmitting(false);
              }
            }}
          >
            <div className="space-y-2">
              <Input
                id="import-url"
                name="url"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder={t("importUrlPlaceholder")}
                aria-label={t("importUrlLabel")}
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={urlSubmitting}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={urlSubmitting}
                onClick={() => onOpenChange(false)}
              >
                {t("importCancel")}
              </Button>
              <Button type="submit" disabled={urlSubmitting}>
                {t("importUrlSubmit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
