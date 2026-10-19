import { AlertTriangle, CircleAlert, Clock, PauseCircle, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";
import {
  priorityCode,
  priorityLabel,
  priorityLevel,
  slaTone,
  slaVisible,
  statusTone,
  type PriorityLevel,
  type SlaTone,
  type StatusTone,
} from "../model/format";

const STATUS_CLASS: Record<StatusTone, string> = {
  open: "bg-primary-soft text-primary",
  pending: "bg-warning-soft text-warning-text",
  resolved: "bg-success-soft text-success-text",
  closed: "bg-surface-2 text-muted-foreground border border-border/60",
};

export function StatusBadge({
  label,
  code = "",
  category,
  className,
}: {
  label: string;
  code?: string;
  category?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_CLASS[statusTone(category, code, label)],
        className,
      )}
    >
      {label}
    </span>
  );
}

const PRIORITY_CLASS: Record<PriorityLevel, string> = {
  critical: "bg-destructive-soft text-destructive-text",
  high: "bg-warning-soft text-warning-text",
  medium: "bg-primary-soft text-primary",
  low: "bg-surface-2 text-muted-foreground",
};

const PRIORITY_BAR: Record<PriorityLevel, string> = {
  critical: "bg-destructive",
  high: "bg-warning",
  medium: "bg-primary",
  low: "bg-muted-foreground/50",
};

/** chip: "High"; compact: "P2"; tag: bar + "P2 — High" (ef-priority-tag). */
export function PriorityBadge({
  priority,
  variant = "chip",
  className,
}: {
  priority: string;
  variant?: "chip" | "compact" | "tag";
  className?: string;
}) {
  const { t } = useTranslation();
  const level = priorityLevel(priority);
  const label = priorityLabel(priority);
  if (variant === "tag") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
        <span className={cn("h-3 w-1 rounded-full", PRIORITY_BAR[level])} aria-hidden />
        {priorityCode(priority)} — {label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        PRIORITY_CLASS[level],
        className,
      )}
      title={variant === "compact" ? label : undefined}
      aria-label={variant === "compact" ? t("cases.priority-aria", { priority: label }) : undefined}
    >
      {variant === "compact" ? priorityCode(priority) : label}
    </span>
  );
}

const SLA_ICON: Record<SlaTone, LucideIcon> = {
  ok: Clock,
  warning: AlertTriangle,
  breached: CircleAlert,
  paused: PauseCircle,
};

const SLA_CLASS: Record<SlaTone, string> = {
  ok: "text-success-text",
  warning: "text-warning-text",
  breached: "text-destructive-text",
  paused: "text-muted-foreground",
};

/** SLA urgency is never colour-only: icon + colour + text, tabular digits. */
export function SlaBadge({
  slaState,
  slaTimeLabel,
  slaMinutesRemaining,
  slaPausedAt,
  className,
}: {
  slaState?: string | null;
  slaTimeLabel?: string | null;
  slaMinutesRemaining?: number | null;
  slaPausedAt?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const input = { slaState, slaTimeLabel, slaMinutesRemaining, slaPausedAt };
  if (!slaVisible(input)) return <span className="text-xs text-muted-foreground">—</span>;
  const tone = slaTone(input);
  const Icon = SLA_ICON[tone];
  const label = slaPausedAt && !slaTimeLabel ? t("cases.sla.paused") : (slaTimeLabel ?? "—");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        SLA_CLASS[tone],
        className,
      )}
      data-sla={tone}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span>{label}</span>
      <span className="sr-only">{t(`cases.sla.${tone}`)}</span>
    </span>
  );
}
