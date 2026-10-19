import { describe, expect, it } from "vitest";
import { widgetMetrics, thresholdColor } from "./data";
import type { WidgetConfig } from "./model";
const chart: WidgetConfig = {
  title: "Queue history",
  category: "QUEUES",
  metric: "QUEUE_SUMMARY",
  visualizationType: "LINE",
  settings: { selectedMetricFields: ["offered", "answered"] },
};
describe("reporting metric selection", () => {
  it("preserves selected series across every history row with unique keys", () => {
    const values = widgetMetrics(chart, {
      data: [
        { hour: "09:00", offered: 0, answered: 0, ignored: 99 },
        { hour: "10:00", offered: "20", answered: 15 },
      ],
    });
    expect(values.map((m) => m.value)).toEqual([0, 0, 20, 15]);
    expect(values.map((m) => m.label)).toEqual([
      "09:00 · Offered",
      "09:00 · Answered",
      "10:00 · Offered",
      "10:00 · Answered",
    ]);
    expect(new Set(values.map((m) => m.key)).size).toBe(4);
  });
  it("retains valid zero KPI values and does not invent missing metrics", () => {
    expect(
      widgetMetrics(
        { ...chart, metric: "SLA", visualizationType: "KPI", settings: {} },
        { data: { sla: 0 } },
      ),
    ).toEqual([{ key: "serviceLevel", label: "Service level", value: 0 }]);
    expect(widgetMetrics({ ...chart, metric: "SLA", settings: {} }, {})).toEqual([]);
  });
  it("honors ordered threshold boundaries", () => {
    expect(
      thresholdColor(80, [
        { value: 80, operator: ">=", color: "green" },
        { value: 80, operator: "<", color: "red" },
      ]),
    ).toBe("green");
  });
});
