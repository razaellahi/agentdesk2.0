import { PackageX, ShieldOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";

/** A blocked module: no permission, or switched off for this deployment (flag, profile, desk setting). */
export function ForbiddenPage({ reason = "forbidden" }: { reason?: "forbidden" | "unavailable" }) {
  const { t } = useTranslation();
  const unavailable = reason === "unavailable";
  return (
    <EmptyState
      icon={unavailable ? PackageX : ShieldOff}
      title={t(unavailable ? "errors.unavailable-title" : "errors.forbidden-title")}
      description={t(unavailable ? "errors.unavailable-description" : "errors.forbidden-description")}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t("errors.go-home")}</Link>
        </Button>
      }
    />
  );
}
