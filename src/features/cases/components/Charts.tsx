import { cn } from "@/shared/lib/utils";

/** Series colours from theme tokens (charts stay in sync with light/dark mode). */
const STROKES = [
  "stroke-primary",
  "stroke-success",
  "stroke-warning",
  "stroke-destructive",
  "stroke-brand-2",
  "stroke-accent-cool",
  "stroke-muted-foreground",
];
const FILLS = [
  "bg-primary",
  "bg-success",
  "bg-warning",
  "bg-destructive",
  "bg-brand-2",
  "bg-accent-cool",
  "bg-muted-foreground",
];

export interface ChartDatum {
  key: string;
  label: string;
  value: number;
}

/** Donut + legend; legend rows drill into the Workbench (dashboard "Open by status"). */
export function DonutChart({
  data,
  label,
  onSelect,
}: {
  data: ChartDatum[];
  label: string;
  onSelect?: (key: string) => void;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 15.915; // circumference 100 -> dash values are percentages
  let offset = 25;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        viewBox="0 0 42 42"
        className="size-36 shrink-0"
        role="img"
        aria-label={`${label}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}
      >
        <circle cx="21" cy="21" r={radius} fill="none" className="stroke-surface-2" strokeWidth="6" />
        {total > 0 &&
          data.map((d, i) => {
            const pct = (d.value / total) * 100;
            const segment = (
              <circle
                key={d.key}
                cx="21"
                cy="21"
                r={radius}
                fill="none"
                strokeWidth="6"
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeDashoffset={offset}
                className={STROKES[i % STROKES.length]}
              />
            );
            offset -= pct;
            return segment;
          })}
        <text
          x="21"
          y="23"
          textAnchor="middle"
          className="fill-foreground text-[6px] font-semibold tabular-nums"
        >
          {total}
        </text>
      </svg>
      <ul className="min-w-40 flex-1 space-y-1">
        {data.map((d, i) => (
          <li key={d.key}>
            <button
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(d.key)}
              className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-start text-sm enabled:hover:bg-surface-2"
            >
              <span className={cn("size-2.5 shrink-0 rounded-full", FILLS[i % FILLS.length])} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{d.label}</span>
              <span className="text-muted-foreground tabular-nums">{d.value}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars, one row per datum, scaled to the largest value. */
export function BarList({
  data,
  onSelect,
  minWidthPercent = 0,
}: {
  data: ChartDatum[];
  onSelect?: (key: string) => void;
  minWidthPercent?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.key}>
          <button
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(d.key)}
            className="w-full rounded-md px-1 py-0.5 text-start enabled:hover:bg-surface-2"
          >
            <span className="mb-1 flex justify-between gap-2 text-xs">
              <span className="truncate">{d.label}</span>
              <span className="text-muted-foreground tabular-nums">{d.value}</span>
            </span>
            <span className="block h-2.5 overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${d.value > 0 ? Math.max(minWidthPercent, (d.value / max) * 100) : 0}%` }}
              />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function KpiTile({
  label,
  value,
  footnote,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  footnote?: string | null;
  tone?: "neutral" | "bad";
}) {
  return (
    <div className="h-full rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "bad" && Number(value) > 0 && "text-destructive-text",
        )}
      >
        {value}
      </p>
      {footnote && <p className="mt-0.5 text-xs text-muted-foreground">{footnote}</p>}
    </div>
  );
}
