import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
/** Focus-managed screen recording player with keyboard dismissal. */
export function VideoPlayer({ url, onClose }: { url: string; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("recordings.video")}</DialogTitle>
        </DialogHeader>
        <video src={url} controls autoPlay className="max-h-[70vh] w-full rounded-lg bg-black">
          <track kind="captions" />
        </video>
      </DialogContent>
    </Dialog>
  );
}
