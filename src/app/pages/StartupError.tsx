import { AlertTriangle, RotateCw } from "lucide-react";
import { ConfigError } from "@/config";
import { ApiError } from "@/core/api";
import { i18n } from "@/core/i18n";

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
    <main className="grid h-full place-items-center bg-canvas p-4">
      <div className="w-full max-w-md rounded-xl border bg-surface p-6 text-center shadow-pop">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-destructive-soft text-destructive-text">
          <AlertTriangle className="size-6" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold">Unable to start Agent Desk</h1>
        <p className="mt-1 text-sm font-medium text-medium">{title}</p>
        {detail && <p className="mt-2 text-sm break-words text-muted-foreground">{detail}</p>}
        {issues.length > 0 && (
          <ul className="mt-3 max-h-40 overflow-auto rounded-md bg-surface-2 p-3 text-start font-mono text-xs text-medium">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <RotateCw className="size-4" aria-hidden />
          Retry
        </button>
      </div>
    </main>
  );
}
