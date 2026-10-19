import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { createLogger } from "@/core/logging/logger";

const log = createLogger("route");
const newReference = () => Math.random().toString(36).slice(2, 10).toUpperCase();

function describe(error: unknown): string {
  if (error instanceof Error)
    return [`${error.name}: ${error.message}`, error.stack?.split("\n").slice(1, 7).join("\n")]
      .filter(Boolean)
      .join("\n");
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}

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
        action={
          <div className="flex max-w-xl flex-col items-center gap-3">
            <Button onClick={() => globalThis.location.reload()}>{t("errors.reload")}</Button>
            {/* The cause, so a report can say more than the reference alone. */}
            <details className="w-full text-start text-xs text-muted-foreground">
              <summary className="cursor-pointer text-center">{t("errors.details")}</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-surface-2 p-3 break-words whitespace-pre-wrap">
                {describe(error)}
              </pre>
            </details>
          </div>
        }
      />
    </div>
  );
}
