import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** Page chrome shared by the Case Management settings sections. */
export function AdminFrame({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function AdminCard({
  title,
  hint,
  children,
  className,
}: {
  title?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4 rounded-xl border border-border bg-surface p-5", className)}>
      {(title || hint) && (
        <div>
          {title && <h2 className="text-sm font-medium">{title}</h2>}
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: "error" | "success" | "warning" | "info";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl px-4 py-3 text-sm",
        tone === "error" && "bg-destructive-soft text-destructive-text",
        tone === "success" && "bg-success-soft text-success-text",
        tone === "warning" && "bg-warning-soft text-warning-text",
        tone === "info" && "bg-primary-soft/60 text-foreground",
      )}
    >
      {children}
    </div>
  );
}
