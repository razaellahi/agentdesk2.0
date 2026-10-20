import { CalendarRange } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/shared/lib/utils";
import {
  InvalidRangeError,
  customRange,
  defaultCustomRange,
  type Period,
  type ReportPresetDays,
} from "../model/reportRange";

const PRESETS: ReportPresetDays[] = [7, 30, 90];

/** Preset segments plus a Custom range popover; the range applies on demand. */
export function PeriodFilter({
  value,
  onChange,
  allowLive,
  meta,
}: {
  value: Period;
  onChange: (period: Period) => void;
  allowLive?: boolean;
  /** Quiet explanation of what the period covers. */
  meta?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState(() =>
    value.kind === "custom" ? { from: value.from, to: value.to } : defaultCustomRange(),
  );
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    try {
      customRange(range.from, range.to);
      setError(null);
      onChange({ kind: "custom", ...range });
      setOpen(false);
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
      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
      active ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-label={t("cases.period.label")}>
      <div
        role="radiogroup"
        aria-label={t("cases.period.presets")}
        className="inline-flex gap-0.5 rounded-lg bg-surface-2 p-0.5"
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant={value.kind === "custom" ? "secondary" : "outline"}>
            <CalendarRange />
            {value.kind === "custom" ? `${value.from} – ${value.to}` : t("cases.period.custom")}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-3 p-4">
          <div className="space-y-2">
            <label className="block space-y-1 text-xs text-muted-foreground">
              {t("cases.period.start")}
              <Input
                type="date"
                value={range.from}
                onChange={(event) => setRange((r) => ({ ...r, from: event.target.value }))}
              />
            </label>
            <label className="block space-y-1 text-xs text-muted-foreground">
              {t("cases.period.end")}
              <Input
                type="date"
                value={range.to}
                onChange={(event) => setRange((r) => ({ ...r, to: event.target.value }))}
              />
            </label>
          </div>
          {error && <p className="text-xs text-destructive-text">{error}</p>}
          <Button size="sm" className="w-full" onClick={apply}>
            {t("cases.period.apply")}
          </Button>
        </PopoverContent>
      </Popover>
      {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
    </div>
  );
}
