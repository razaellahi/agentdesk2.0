import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={SearchX}
      title={t("errors.not-found-title")}
      description={t("globals.page-not-found")}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t("errors.go-home")}</Link>
        </Button>
      }
    />
  );
}
