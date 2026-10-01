import { Hammer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMatches } from "react-router";
import { EmptyState } from "@/components/common/EmptyState";
import type { RouteHandle } from "../router/router";

/** Temporary page for modules whose delivery phase has not landed yet. */
export default function ModulePlaceholder() {
  const { t } = useTranslation();
  const handle = useMatches().at(-1)?.handle as RouteHandle | undefined;
  return (
    <EmptyState
      icon={Hammer}
      title={handle?.titleKey ? t(handle.titleKey) : ""}
      description={t("shell.module-in-progress")}
    />
  );
}
