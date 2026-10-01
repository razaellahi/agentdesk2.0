import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Shown when the user can view but not change a settings screen (missing `manage` scope). */
export function ReadOnlyNotice() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-primary bg-primary-soft px-3 py-2 text-sm text-primary">
      <Lock className="size-4 shrink-0" aria-hidden />
      {t("common.read-only")}
    </div>
  );
}
