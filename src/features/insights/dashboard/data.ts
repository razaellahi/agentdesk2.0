import type { Threshold, WidgetConfig } from "./model";
const OMIT = new Set(["error", "message", "__typename", "success"]);
const ID = /(^id$|^_id$|Id$|Name$|^name$|^title$|^label$|^hour$|^date$|^time$|^day$|^period$|^timestamp$)/;
export function reportingRows(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data))
    return data.filter((d): d is Record<string, unknown> => Boolean(d) && typeof d === "object");
  const root = data as Record<string, unknown>;
  for (const key of ["data", "docs", "items", "results", ...Object.keys(root)]) {
    if (Array.isArray(root[key])) return reportingRows(root[key]);
  }
  if (root.data && typeof root.data === "object") return reportingRows(root.data);
  return [root];
}
export function flattenRow(row: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (OMIT.has(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [nested, v] of Object.entries(value))
        if (typeof v !== "object") flat[`${key}_${nested}`] = v;
    } else
      flat[key] = Array.isArray(value)
        ? value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ")
        : value;
  }
  return flat;
}
export function numeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && /^-?\d+(\.\d+)?%?$/.test(value.trim()))
    return Number(value.trim().replace(/%$/, ""));
  return null;
}
export interface MetricValue {
  key: string;
  label: string;
  value: number;
  series?: string;
  point?: number;
}
export function fieldLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (s) => s.toUpperCase());
}
export function widgetMetrics(config: WidgetConfig, data: unknown): MetricValue[] {
  const rows = reportingRows(data).map(flattenRow);
  const first = rows[0];
  if (!first) return [];
  const find = (aliases: string[]) => aliases.map((k) => numeric(first[k])).find((v) => v != null) ?? null;
  let metrics: MetricValue[];
  if (config.metric === "SLA") {
    const value = find(["sla", "slaPercentage", "serviceLevel", "slPercent"]);
    metrics = value == null ? [] : [{ key: "serviceLevel", label: "Service level", value }];
  } else if (config.metric === "AWT_AHT") {
    metrics = [
      ["avgWaitTime", "Average wait time", ["awt", "avgWaitTime", "averageWaitTime", "waitTime"]],
      ["avgHandleTime", "Average handle time", ["aht", "avgHandleTime", "averageHandleTime", "handleTime"]],
    ].flatMap(([key, label, aliases]) => {
      const value = find(aliases as string[]);
      return value == null ? [] : [{ key: key as string, label: label as string, value }];
    });
  } else if (rows.length > 1 && config.visualizationType !== "KPI") {
    metrics = rows.flatMap((row, index) => {
      const label = String(
        row.hour ??
          row.date ??
          row.time ??
          row.day ??
          row.period ??
          row.timestamp ??
          row.queueName ??
          row.agentName ??
          row.channel ??
          row.mrdName ??
          row.teamName ??
          row.botName ??
          row.name ??
          row.label ??
          index + 1,
      );
      const numericFields = Object.keys(row).filter((k) => !ID.test(k) && numeric(row[k]) != null);
      const fields = config.settings?.selectedMetricFields?.length
        ? numericFields.filter((k) => config.settings!.selectedMetricFields!.includes(k))
        : [config.settings?.primaryMetricField ?? numericFields[0]].filter((k): k is string => Boolean(k));
      return fields.flatMap((key) => {
        const value = numeric(row[key]);
        return value == null
          ? []
          : [
              {
                key: `${index}:${key}`,
                label: fields.length > 1 ? `${label} · ${fieldLabel(key)}` : label,
                value,
                series: key,
                point: index,
              },
            ];
      });
    });
  } else
    metrics = Object.entries(first).flatMap(([key, v]) => {
      const value = numeric(v);
      return value == null || ID.test(key) ? [] : [{ key, label: fieldLabel(key), value }];
    });
  if (
    config.metric === "ABANDONED_RATIO" &&
    !metrics.some((m) => ["abandonRate", "abandonedRatio", "abandonRatio"].includes(m.key))
  ) {
    const count = find(["abandonedCount", "abandoned"]);
    const total = find(["totalOffered", "offered", "total"]);
    if (count != null && total != null && total > 0)
      metrics.unshift({ key: "abandonRate", label: "Abandon rate %", value: (count / total) * 100 });
  }
  const selected = config.settings?.selectedMetricFields;
  return selected?.length &&
    !(rows.length > 1 && config.visualizationType !== "KPI" && !["SLA", "AWT_AHT"].includes(config.metric))
    ? metrics.filter((m) => selected.includes(m.key))
    : metrics;
}
export function thresholdColor(value: number, thresholds: Threshold[] = []): string | undefined {
  return thresholds.find((t) =>
    t.operator === ">"
      ? value > t.value
      : t.operator === ">="
        ? value >= t.value
        : t.operator === "<"
          ? value < t.value
          : t.operator === "<="
            ? value <= t.value
            : value === t.value,
  )?.color;
}
