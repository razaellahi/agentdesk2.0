import { describe, expect, it } from "vitest";
import { AiWidgetError, extractJson, normalizeWidgetConfig } from "./aiWidget";
import { DYNAMIC_PLACEHOLDERS as D } from "./model";

describe("AI widget response handling", () => {
  it("extracts the first JSON object from surrounding text", () => {
    expect(extractJson('Sure!\n```json\n{"title":"SLA","category":"QUEUES"}\n```')).toEqual({
      title: "SLA",
      category: "QUEUES",
    });
  });

  it("rejects replies without JSON", () => {
    expect(() => extractJson("no widget here")).toThrow(AiWidgetError);
  });

  it("keeps a valid config and fills empty scope with dynamic defaults", () => {
    const config = normalizeWidgetConfig({
      title: "Queue SLA",
      category: "queues",
      metric: "sla",
      visualizationType: "kpi",
      settings: { queueIds: [], mrdId: "", teamId: "" },
    });
    expect(config).toMatchObject({
      title: "Queue SLA",
      category: "QUEUES",
      metric: "SLA",
      visualizationType: "KPI",
    });
    expect(config.settings).toMatchObject({
      teamId: D.CURRENT_TEAM,
      queueIds: [D.ALL_QUEUES],
      mrdId: D.ALL_MRDS,
    });
  });

  it("falls back to a supported visualization for the metric", () => {
    const config = normalizeWidgetConfig({
      category: "QUEUES",
      metric: "QUEUE_SUMMARY",
      visualizationType: "PIE",
    });
    expect(config.visualizationType).toBe("TABLE");
    expect(config.title).toBe("Queue Stats Summary");
  });

  it("rejects unknown categories and metrics", () => {
    expect(() => normalizeWidgetConfig({ category: "SALES", metric: "SLA" })).toThrow(AiWidgetError);
    expect(() => normalizeWidgetConfig({ category: "QUEUES", metric: "REVENUE" })).toThrow(AiWidgetError);
  });
});
