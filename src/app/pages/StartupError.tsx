import { AlertTriangle, RotateCw } from "lucide-react";
import { ConfigError } from "@/config";
import { ApiError } from "@/core/api";
import { i18n } from "@/core/i18n";
import { Button } from "@/components/ui/button";

interface StartupErrorProps {
  error: unknown;
  onRetry: () => void;
}

function describe(error: unknown): { title: string; detail: string; issues: string[] } {
  const tr = (key: string, fallback: string) =>
    i18n.isInitialized ? i18n.t(key, { defaultValue: fallback }) : fallback;
  if (error instanceof ConfigError) {
    return {
      title: tr("errors.config-invalid", "Configuration problem"),
      detail: error.message,
      issues: error.issues,
    };
  }
  if (error instanceof ApiError) {
    return {
      title: tr("errors.startup-service", "A required service is unavailable"),
      detail: error.message,
      issues: [],
    };
  }
  return {
    title: tr("errors.startup-unknown", "Something went wrong"),
    detail: (error as Error)?.message ?? "",
    issues: [],
  };
}

/** Shown when bootstrap fails (config, tenant settings, Agent Desk settings). */
export function StartupError({ error, onRetry }: StartupErrorProps) {
  const { title, detail, issues } = describe(error);
  return (
    <main className="desk-canvas grid h-full place-items-center p-4">
      <div className="desk-panel desk-enter w-full max-w-md rounded-2xl p-7 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-destructive-soft text-destructive-text">
          <AlertTriangle className="size-6" aria-hidden />
        </div>
        <h1 className="font-display text-xl tracking-tight">Unable to start Agent Desk</h1>
        <p className="mt-1 text-sm font-medium text-medium">{title}</p>
        {detail && <p className="mt-2 text-sm break-words text-muted-foreground">{detail}</p>}
        {issues.length > 0 && (
          <ul className="mt-3 max-h-40 overflow-auto rounded-xl bg-muted p-3 text-start font-mono text-xs text-medium">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        <Button type="button" onClick={onRetry} className="mt-5">
          <RotateCw className="size-4" aria-hidden />
          Retry
        </Button>
      </div>
    </main>
  );
}
