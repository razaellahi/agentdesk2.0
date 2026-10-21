import { PictureInPicture2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { FileCard } from "./FileCard";
import { cn } from "@/shared/lib/utils";
import { useSecureMedia } from "./useSecureMedia";
export function Media({
  url,
  kind,
  name,
  size,
}: {
  url?: string;
  kind: "image" | "video" | "audio" | "file";
  name?: string;
  /** Bytes, for a file. */
  size?: number;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const { src, loading, error } = useSecureMedia(url);
  if (!url) return null;
  if (loading)
    // About the size of what arrives, so the row does not jump when it does.
    return (
      <div
        className={cn("animate-pulse rounded-xl bg-black/5", kind === "file" ? "h-44 w-64" : "h-44 w-60")}
      />
    );
  if (error || !src)
    return <p className="text-xs text-destructive-text">{t("workspace.media-unavailable")}</p>;
  if (kind === "image")
    return (
      <>
        <button type="button" onClick={() => setPreview(true)} aria-label={`Preview ${name || "image"}`}>
          <img src={src} alt={name ?? ""} className="max-h-64 max-w-full rounded-xl object-contain" />
        </button>
        <Dialog open={preview} onOpenChange={setPreview}>
          <DialogContent className="sm:max-w-4xl">
            <DialogTitle>{name || "Image preview"}</DialogTitle>
            <DialogDescription>Shared image</DialogDescription>
            <img src={src} alt={name || "Shared image"} className="max-h-[70vh] w-full object-contain" />
          </DialogContent>
        </Dialog>
      </>
    );
  if (kind === "video")
    return (
      <div>
        <video ref={video} src={src} controls className="max-h-64 max-w-full rounded-xl">
          <track kind="captions" />
        </video>
        {document.pictureInPictureEnabled && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const element = video.current;
              if (element)
                void element
                  .requestPictureInPicture()
                  .catch(() => toast.error("Picture-in-picture is unavailable for this video."));
            }}
          >
            <PictureInPicture2 />
            Picture-in-picture
          </Button>
        )}
      </div>
    );
  if (kind === "audio")
    return (
      <audio src={src} controls className="w-64 max-w-full">
        <track kind="captions" />
      </audio>
    );
  return <FileCard src={src} name={name} size={size} />;
}
