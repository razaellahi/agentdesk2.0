import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** Consistent page title block used above toolbars and content. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("desk-enter flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {title && (
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        )}
        {description && (
          <p className={cn("max-w-2xl text-sm leading-relaxed text-muted-foreground", title && "mt-1")}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small status / filter chip with a stable visual language. */
export function StatusChip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide",
        tone === "neutral" && "border border-border/60 bg-surface-2 text-muted-foreground",
        tone === "primary" && "bg-primary-soft text-primary",
        tone === "success" && "bg-success-soft text-success-text",
        tone === "warning" && "bg-warning-soft text-warning-text",
        tone === "danger" && "bg-destructive-soft text-destructive-text",
        className,
      )}
    >
      {children}
    </span>
  );
}
