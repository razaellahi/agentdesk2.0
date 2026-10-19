import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/lib/utils";
import {
  InvalidRangeError,
  customRange,
  defaultCustomRange,
  type Period,
  type ReportPresetDays,
} from "../model/reportRange";

const PRESETS: ReportPresetDays[] = [7, 30, 90];

/** Preset segments + an inclusive custom date range applied on demand. */
export function PeriodFilter({
  value,
  onChange,
  allowLive,
  meta,
}: {
  value: Period;
  onChange: (period: Period) => void;
  allowLive?: boolean;
  meta?: string;
}) {
  const { t } = useTranslation();
  const [range, setRange] = useState(() =>
    value.kind === "custom" ? { from: value.from, to: value.to } : defaultCustomRange(),
  );
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    try {
      customRange(range.from, range.to);
      setError(null);
      onChange({ kind: "custom", ...range });
    } catch (cause) {
      setError(
        cause instanceof InvalidRangeError && cause.reason === "order"
          ? t("cases.period.order-error")
          : t("cases.period.invalid"),
      );
    }
  };

  const segment = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-1.5 text-xs font-medium",
      active ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground",
    );

  return (
    <section
      className="space-y-2 rounded-2xl border border-border bg-surface p-4"
      aria-label={t("cases.period.label")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-28 text-xs font-medium text-muted-foreground">{t("cases.period.label")}</span>
        <div
          role="radiogroup"
          aria-label={t("cases.period.presets")}
          className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1"
        >
          {allowLive && (
            <button
              type="button"
              role="radio"
              aria-checked={value.kind === "live"}
              className={segment(value.kind === "live")}
              onClick={() => onChange({ kind: "live" })}
            >
              {t("cases.period.live")}
            </button>
          )}
          {PRESETS.map((days) => {
            const active = value.kind === "preset" && value.days === days;
            return (
              <button
                key={days}
                type="button"
                role="radio"
                aria-checked={active}
                className={segment(active)}
                onClick={() => onChange({ kind: "preset", days })}
              >
                {t("cases.period.days", { count: days })}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-28 text-xs font-medium text-muted-foreground">{t("cases.period.custom")}</span>
        <Input
          type="date"
          className="h-8 w-40"
          value={range.from}
          aria-label={t("cases.period.start")}
          onChange={(event) => setRange((r) => ({ ...r, from: event.target.value }))}
        />
        <span className="text-xs text-muted-foreground">{t("cases.period.to")}</span>
        <Input
          type="date"
          className="h-8 w-40"
          value={range.to}
          aria-label={t("cases.period.end")}
          onChange={(event) => setRange((r) => ({ ...r, to: event.target.value }))}
        />
        <Button size="sm" variant={value.kind === "custom" ? "secondary" : "outline"} onClick={apply}>
          {t("cases.period.apply")}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive-text">{error}</p>}
      {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
    </section>
  );
}
