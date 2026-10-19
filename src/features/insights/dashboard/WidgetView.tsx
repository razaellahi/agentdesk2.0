import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, Td, Th } from "@/components/common/DataView";
import { fetchWidgetData } from "./api";
import { fieldLabel, flattenRow, reportingRows, thresholdColor, widgetMetrics } from "./data";
import { LineChart } from "./LineChart";
import type { WidgetConfig } from "./model";
const COLORS = [
  "var(--primary)",
  "var(--accent-cool)",
  "var(--chart-3)",
  "var(--warn)",
  "var(--error)",
  "var(--muted-text)",
];
export function WidgetView({ config, interval }: { config: WidgetConfig; interval: number }) {
  const query = useQuery({
    queryKey: ["dashboard-widget", config.metric, config.settings],
    queryFn: ({ signal }) => fetchWidgetData(config, signal),
    refetchInterval: interval * 1000,
    refetchIntervalInBackground: false,
  });
  const [tablePage, setTablePage] = useState(0);
  if (query.isPending) return <Skeleton className="h-28 w-full" />;
  if (query.isError)
    return (
      <div role="alert" className="p-3 text-sm text-destructive-text">
        {query.error.message}
        <Button variant="outline" size="sm" className="ms-2" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  const metrics = widgetMetrics(config, query.data);
  const rows = reportingRows(query.data).map(flattenRow);
  if (config.visualizationType === "TABLE") {
    const allColumns = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter(
      (k) => k !== "id" && k !== "_id",
    );
    const selected = config.settings?.selectedMetricFields;
    const columns = selected?.length ? allColumns.filter((c) => selected.includes(c)) : allColumns;
    const currentPage = Math.min(tablePage, Math.max(0, Math.ceil(rows.length / 10) - 1));
    return (
      <div className="overflow-auto">
        <DataTable>
          <thead>
            <tr>
              {columns.map((c) => (
                <Th key={c}>{fieldLabel(c)}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(currentPage * 10, currentPage * 10 + 10).map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <Td key={c}>
                    <span
                      style={{
                        color:
                          typeof row[c] === "number"
                            ? thresholdColor(row[c], config.settings?.thresholds)
                            : undefined,
                      }}
                    >
                      {String(row[c] ?? "—")}
                    </span>
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </DataTable>
        {rows.length > 10 && (
          <div className="flex justify-between p-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={currentPage === 0}
              onClick={() => setTablePage(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="text-xs">
              {currentPage + 1} / {Math.ceil(rows.length / 10)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={(currentPage + 1) * 10 >= rows.length}
              onClick={() => setTablePage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    );
  }
  if (!metrics.length) return <p className="p-4 text-sm text-muted-foreground">No metric data available.</p>;
  if (config.visualizationType === "KPI")
    return (
      <div className="grid grid-cols-2 gap-4 p-4">
        {metrics.map((m) => (
          <div key={m.key}>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p
              className="mt-2 text-3xl font-semibold tabular-nums"
              style={{ color: thresholdColor(m.value, config.settings?.thresholds) }}
            >
              {m.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {config.metric === "SLA" || config.metric === "AGENT_OCCUPANCY" || m.key === "abandonRate"
                ? "%"
                : config.metric === "AWT_AHT"
                  ? "s"
                  : ""}
            </p>
          </div>
        ))}
      </div>
    );
  const max = Math.max(1, ...metrics.map((m) => m.value));
  const total = metrics.reduce((sum, m) => sum + Math.max(0, m.value), 0);
  let accumulated = 0;
  const segments = metrics.map((m, i) => {
    const start = accumulated;
    accumulated += total ? (Math.max(0, m.value) / total) * 100 : 0;
    return `${thresholdColor(m.value, config.settings?.thresholds) ?? COLORS[i % COLORS.length]} ${start}% ${accumulated}%`;
  });
  return (
    <div className="space-y-3 p-4">
      {config.visualizationType === "PIE" ? (
        <div
          role="img"
          aria-label={metrics.map((m) => `${m.label}: ${m.value}`).join(", ")}
          className="mx-auto size-36 rounded-full"
          style={{ background: total ? `conic-gradient(${segments.join(",")})` : "var(--sec)" }}
        />
      ) : config.visualizationType === "LINE" ? (
        <LineChart metrics={metrics} colors={COLORS} />
      ) : (
        <div className="space-y-3">
          {metrics.map((m, i) => (
            <div key={m.key}>
              <div className="mb-1 flex justify-between gap-2 text-xs">
                <span>{m.label}</span>
                <span className="tabular-nums">{m.value.toLocaleString()}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-sm bg-muted">
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: `${(Math.max(0, m.value) / max) * 100}%`,
                    background:
                      thresholdColor(m.value, config.settings?.thresholds) ?? COLORS[i % COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {config.visualizationType !== "BAR" && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {metrics.map((m, i) => (
            <div key={m.key} className="flex gap-1">
              <dt className="flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {m.label}
              </dt>
              <dd className="font-medium tabular-nums">{m.value.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
