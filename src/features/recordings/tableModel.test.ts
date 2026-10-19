import { describe, expect, it } from "vitest";
import { recordingValue, sortedRecordingGroups } from "./tableModel";
describe("recording table source fields and correlation", () => {
  it("reads camel case and legacy call variables without treating zero as absent", () => {
    expect(recordingValue({ callVariable1: "Case 100" }, "call_variable1")).toBe("Case 100");
    expect(recordingValue({ call_variable1: "Legacy" }, "call_variable1")).toBe("Legacy");
    expect(recordingValue({ duration: 0 }, "duration")).toBe(0);
  });
  it("sorts numeric values and keeps all related legs in a single collapsible group", () => {
    const grouped = sortedRecordingGroups(
      [
        { sessionId: "a", correlationId: "call-1", duration: 20 },
        { sessionId: "b", duration: 9 },
        { sessionId: "c", correlationId: "call-1", duration: 2 },
        { sessionId: "d", correlationId: "0", duration: 30 },
      ],
      "duration",
    );
    expect(grouped.map(([id]) => id)).toEqual(["call:call-1", "session:b:1", "session:d:3"]);
    expect(grouped[0]?.[1].map((r) => r.sessionId)).toEqual(["c", "a"]);
    expect(grouped.flatMap(([, legs]) => legs)).toHaveLength(4);
  });
});
