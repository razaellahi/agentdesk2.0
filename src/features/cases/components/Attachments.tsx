import { AlertCircle, Download, FileText, Loader2, Paperclip, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadAttachment, fetchAttachmentBlob, type CaseAttachment } from "../api";
import { TEXT_PREVIEW_MAX_BYTES, attachmentPreviewKind, formatBytes } from "../model/format";

/** Filename + size chips; clicking one opens the preview (ef-attachment-chip). */
export function AttachmentChips({
  attachments,
  label,
  onRemove,
}: {
  attachments: CaseAttachment[];
  label?: string;
  onRemove?: (attachment: CaseAttachment) => void;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<CaseAttachment | null>(null);
  if (!attachments.length) return null;
  return (
    <>
      <ul className="flex flex-wrap gap-1.5" aria-label={label ?? t("cases.attachments")}>
        {attachments.map((a) => (
          <li key={a.id}>
            <span className="inline-flex max-w-64 items-center rounded-lg border border-border bg-surface text-xs">
              <button
                type="button"
                className="flex min-w-0 items-center gap-1.5 px-2 py-1 hover:text-primary disabled:cursor-default disabled:opacity-60"
                onClick={() => setPreview(a)}
                disabled={!a.externalFileId && !a.mediaUrl}
                aria-label={t("cases.preview-file", { name: a.fileName })}
                title={a.fileName}
              >
                <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate font-medium">{a.fileName}</span>
                {a.sizeBytes ? (
                  <span className="shrink-0 text-muted-foreground">{formatBytes(a.sizeBytes)}</span>
                ) : null}
              </button>
              {onRemove && (
                <button
                  type="button"
                  className="me-1 grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-surface-2"
                  aria-label={t("cases.remove-file", { name: a.fileName })}
                  onClick={() => onRemove(a)}
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <AttachmentPreviewDialog attachment={preview} onClose={() => setPreview(null)} />
    </>
  );
}

type PreviewState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; blob: Blob; url: string | null; text: string | null };

function AttachmentPreviewDialog({
  attachment,
  onClose,
}: {
  attachment: CaseAttachment | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(attachment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        {attachment && <AttachmentPreview key={attachment.id} attachment={attachment} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AttachmentPreview({ attachment, onClose }: { attachment: CaseAttachment; onClose: () => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<PreviewState>({ kind: "loading" });
  const previewKind = attachmentPreviewKind(attachment);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    fetchAttachmentBlob(attachment)
      .then(async (blob) => {
        if (cancelled) return;
        let text: string | null = null;
        if (previewKind === "text") {
          text =
            blob.size > TEXT_PREVIEW_MAX_BYTES
              ? t("cases.preview-too-large", { size: formatBytes(blob.size) })
              : await blob.text();
        } else if (previewKind === "image" || previewKind === "pdf") {
          objectUrl = URL.createObjectURL(blob);
        }
        if (!cancelled) setState({ kind: "ready", blob, url: objectUrl, text });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment, previewKind, t]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 pe-8">
          <Paperclip className="size-4 shrink-0" aria-hidden />
          <span className="truncate" title={attachment.fileName}>
            {attachment.fileName}
          </span>
        </DialogTitle>
      </DialogHeader>
      <div className="grid max-h-[70vh] min-h-48 place-items-center overflow-auto rounded-lg bg-surface-2/60">
        {state.kind === "loading" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("cases.preview-loading")}
          </p>
        )}
        {state.kind === "error" && (
          <p className="flex items-center gap-2 p-6 text-sm text-destructive-text">
            <AlertCircle className="size-4" /> {t("cases.preview-failed")}
          </p>
        )}
        {state.kind === "ready" && previewKind === "image" && state.url && (
          <img src={state.url} alt={attachment.fileName} className="max-h-[68vh] max-w-full object-contain" />
        )}
        {state.kind === "ready" && previewKind === "pdf" && state.url && (
          <iframe src={state.url} title={attachment.fileName} className="h-[68vh] w-full border-0" />
        )}
        {state.kind === "ready" && previewKind === "text" && (
          <pre className="w-full self-start p-4 text-xs whitespace-pre-wrap">{state.text}</pre>
        )}
        {state.kind === "ready" && previewKind === "none" && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-2 size-8" aria-hidden />
            <p>{t("cases.preview-unsupported")}</p>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t("cases.close")}
        </Button>
        <Button
          disabled={state.kind !== "ready"}
          onClick={() => state.kind === "ready" && downloadAttachment(attachment, state.blob)}
        >
          <Download />
          {t("cases.download")}
        </Button>
      </DialogFooter>
    </>
  );
}
