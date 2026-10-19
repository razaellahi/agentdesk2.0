import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/** A failed list load, stated plainly with a retry, instead of an empty table that looks like "no data". */
export function QueryError({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-2 border-b border-destructive/30 bg-destructive-soft px-4 py-2 text-sm text-destructive-text"
    >
      <AlertCircle className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate" title={error.message}>
        {t("errors.load-failed")} {error.message}
      </span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        {t("supervisor.retry")}
      </Button>
    </div>
  );
}
