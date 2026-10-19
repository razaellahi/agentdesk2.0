import { SquareArrowOutUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/core/auth";

/** The widget opened Case Console in a new window; here the Workbench is a desk route. */
export function OpenInWorkbench({ caseId }: { caseId?: string }) {
  const { t } = useTranslation();
  const canOpen = usePermission("cases");
  if (!canOpen) return null;
  return (
    <Button
      asChild
      size="icon-xs"
      variant="ghost"
      className="size-7 rounded-full text-muted-foreground"
      aria-label={t("cases.conversation.open-workbench")}
      title={t("cases.conversation.open-workbench")}
    >
      <Link to={caseId ? `/cases?caseId=${encodeURIComponent(caseId)}` : "/cases"}>
        <SquareArrowOutUpRight className="size-3.5" />
      </Link>
    </Button>
  );
}
