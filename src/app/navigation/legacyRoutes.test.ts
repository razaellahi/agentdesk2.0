import { describe, expect, it } from "vitest";
import { legacyHashTarget, mapLegacyPath } from "./legacyRoutes";

describe("legacy route mapping", () => {
  it("maps unified-agent, VRS and admin routes", () => {
    expect(mapLegacyPath("/supervisor/dashboards")).toBe("/insights/summary");
    expect(mapLegacyPath("customers/chats")).toBe("/conversations");
    expect(mapLegacyPath("#/home")).toBe("/recordings");
    expect(mapLegacyPath("/agent-desk/translations")).toBe("/admin/translations");
  });
  it("passes through 2.0 paths and ignores empties", () => {
    expect(mapLegacyPath("/recordings/rules")).toBe("/recordings/rules");
    expect(mapLegacyPath("")).toBeNull();
    expect(legacyHashTarget("")).toBeNull();
    expect(legacyHashTarget("#/supervisor/queue-chats")).toBe("/supervise/queues");
  });
});
