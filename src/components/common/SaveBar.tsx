import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface SaveBarProps {
  visible: boolean;
  saving?: boolean;
  canSave?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  message?: ReactNode;
}

/** Sticky footer shown while a form has unsaved changes. */
export function SaveBar({ visible, saving, canSave = true, onSave, onDiscard, message }: SaveBarProps) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <div
      className="sticky bottom-0 z-20 -mx-4 mt-6 border-t bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
      role="region"
      aria-label={t("common.unsaved-title")}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-medium">{message ?? t("common.unsaved-changes")}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDiscard} disabled={saving}>
            {t("common.discard")}
          </Button>
          <Button type="button" onClick={onSave} disabled={!canSave || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
