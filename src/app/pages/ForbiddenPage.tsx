import { ShieldOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";

export function ForbiddenPage() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={ShieldOff}
      title={t("errors.forbidden-title")}
      description={t("errors.forbidden-description")}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t("errors.go-home")}</Link>
        </Button>
      }
    />
  );
}
