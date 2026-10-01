import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { createLogger } from "@/core/logging/logger";

const log = createLogger("route");
const newReference = () => Math.random().toString(36).slice(2, 10).toUpperCase();

/** Route-level error boundary: shows a reference id that support can match in logs. */
export function RouteError() {
  const error = useRouteError();
  const { t } = useTranslation();
  const [ref] = useState(newReference);

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t("errors.not-found-title")}
        description={t("globals.page-not-found")}
      />
    );
  }
  log.error(`Unhandled route error [${ref}]`, error);
  return (
    <div className="h-full bg-canvas">
      <EmptyState
        icon={AlertTriangle}
        title={t("errors.unexpected-title")}
        description={t("errors.unexpected-description", { ref })}
        action={<Button onClick={() => globalThis.location.reload()}>{t("errors.reload")}</Button>}
      />
    </div>
  );
}
