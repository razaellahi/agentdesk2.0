import { SquareArrowOutUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/core/auth";

/** Opens the case in the desk's Workbench (the widget opened a separate Case Console window). */
export function OpenInWorkbench({ caseId, labelled = false }: { caseId?: string; labelled?: boolean }) {
  const { t } = useTranslation();
  const canOpen = usePermission("cases");
  if (!canOpen) return null;
  const to = caseId ? `/cases?caseId=${encodeURIComponent(caseId)}` : "/cases";
  if (labelled)
    return (
      <Button asChild size="xs" variant="ghost" className="text-foreground/70 hover:text-foreground">
        <Link to={to}>
          <SquareArrowOutUpRight />
          {t("cases.conversation.workbench")}
        </Link>
      </Button>
    );
  return (
    <Button
      asChild
      size="icon-xs"
      variant="ghost"
      className="size-7 rounded-full text-foreground/70"
      aria-label={t("cases.conversation.open-workbench")}
      title={t("cases.conversation.open-workbench")}
    >
      <Link to={to}>
        <SquareArrowOutUpRight className="size-3.5" />
      </Link>
    </Button>
  );
}
