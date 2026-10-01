import { LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/common/EmptyState";

/** Logged in, but no module is permitted for this user. */
export function EmptyWorkspace() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={LayoutGrid}
      title={t("errors.no-modules-title")}
      description={t("errors.no-modules-description")}
    />
  );
}
