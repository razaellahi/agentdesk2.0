import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MAX_ATTACHMENT_BYTES,
  isAllowedAttachment,
  uploadCaseAttachment,
  type AttachmentInput,
  type UploadScope,
} from "../api";

export interface PendingUpload {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  error?: string;
  ref?: AttachmentInput;
}

/** Files upload to File Engine as soon as they are picked; the case stores the returned refs. */
export function useAttachmentUploads() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<PendingUpload[]>([]);

  const update = (id: string, patch: Partial<PendingUpload>) =>
    setFiles((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const add = useCallback(
    (list: FileList | File[], scope: UploadScope) => {
      for (const file of Array.from(list)) {
        const id = crypto.randomUUID();
        if (file.size > MAX_ATTACHMENT_BYTES) {
          setFiles((prev) => [
            ...prev,
            { id, name: file.name, size: file.size, status: "error", error: t("cases.upload.too-large") },
          ]);
          continue;
        }
        if (!isAllowedAttachment(file.name)) {
          setFiles((prev) => [
            ...prev,
            { id, name: file.name, size: file.size, status: "error", error: t("cases.upload.unsupported") },
          ]);
          continue;
        }
        setFiles((prev) => [...prev, { id, name: file.name, size: file.size, status: "uploading" }]);
        uploadCaseAttachment(file, scope)
          .then((ref) => update(id, { status: "done", ref }))
          .catch((error: Error) =>
            update(id, { status: "error", error: error.message || t("cases.upload.failed") }),
          );
      }
    },
    [t],
  );

  const remove = useCallback((id: string) => setFiles((list) => list.filter((f) => f.id !== id)), []);
  const reset = useCallback(() => setFiles([]), []);

  return {
    files,
    add,
    remove,
    reset,
    refs: files.filter((f) => f.status === "done" && f.ref).map((f) => f.ref!),
    uploading: files.some((f) => f.status === "uploading"),
    failed: files.some((f) => f.status === "error"),
  };
}
