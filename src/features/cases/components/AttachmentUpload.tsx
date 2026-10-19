import { AlertCircle, CheckCircle2, FileText, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";
import { ATTACHMENT_ACCEPT } from "../api";
import type { PendingUpload } from "../hooks/useAttachmentUploads";
import { formatBytes } from "../model/format";

export function PendingUploadList({
  files,
  onRemove,
}: {
  files: PendingUpload[];
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (!files.length) return null;
  return (
    <ul className="space-y-1.5" aria-label={t("cases.upload.pending")}>
      {files.map((f) => (
        <li
          key={f.id}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
            f.status === "error" ? "border-destructive/40 bg-destructive-soft" : "border-border bg-surface",
          )}
        >
          {f.status === "error" ? (
            <AlertCircle className="size-4 shrink-0 text-destructive-text" aria-hidden />
          ) : f.status === "done" ? (
            <CheckCircle2 className="size-4 shrink-0 text-success-text" aria-hidden />
          ) : (
            <FileText className="size-4 shrink-0 animate-pulse text-muted-foreground" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate font-medium" title={f.name}>
            {f.name}
          </span>
          <span
            className={cn(
              "shrink-0",
              f.status === "error" ? "text-destructive-text" : "text-muted-foreground",
            )}
          >
            {f.status === "error"
              ? f.error
              : f.status === "done"
                ? t("cases.upload.uploaded", { size: formatBytes(f.size) })
                : t("cases.upload.uploading", { size: formatBytes(f.size) })}
          </span>
          <button
            type="button"
            className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-surface-2"
            aria-label={t("cases.remove-file", { name: f.name })}
            onClick={() => onRemove(f.id)}
          >
            <X className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Drop zone + picker for the create form. */
export function AttachmentDropzone({
  onFiles,
  disabled,
}: {
  onFiles: (files: FileList) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (event.dataTransfer.files.length) onFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-border-strong px-4 py-6 text-center transition-colors hover:bg-surface-2/60 disabled:opacity-50",
          over && "border-primary bg-primary-soft/40",
        )}
      >
        <Paperclip className="size-5 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">{t("cases.upload.drop")}</span>
        <span className="text-xs text-muted-foreground">{t("cases.upload.limits")}</span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={ATTACHMENT_ACCEPT}
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </>
  );
}
