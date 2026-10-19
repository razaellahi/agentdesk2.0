import { describe, expect, it } from "vitest";
import {
  dayRange,
  flattenRecordings,
  wrapupText,
  buildRecordingParams,
  CALL_VARIABLES,
  resolveRecordingUrl,
} from "./api";
import { setConfig } from "@/config";
import { makeConfig } from "@/test/fixtures";

describe("recording day range", () => {
  it("covers today from midnight through the current second", () => {
    const range = dayRange(new Date("2026-10-01T13:05:09"));
    expect(range.startTime).toBe("2026-10-01 00:00:00");
    expect(range.endTime).toBe("2026-10-01 13:05:09");
  });
});

describe("VRS develop contracts", () => {
  it("preserves every session and maps provider fields while retaining parent tags", () => {
    const rows = flattenRecordings([
      {
        callId: "group-1",
        tagId: 7,
        sessions: [
          {
            sessionId: "s1",
            callId: "leg-1",
            callingPhoneNumber: "123",
            calledPhoneNumber: "456",
            sessionStartTime: "2026-10-01 12:00:00",
            wrapupCode: "Resolved",
            screenRecordingUrl: "/vrs/recording/screen/s1",
          },
          { id: "s2", customerNumber: "789", agentExtension: "1001", isArchived: true },
        ],
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      correlationId: "group-1",
      callId: "leg-1",
      tagId: 7,
      callingNumber: "123",
      calledNumber: "456",
      startTime: "2026-10-01 12:00:00",
      downloadUrl: "/vrs/recording/download/s1",
    });
    expect(wrapupText(rows[0]!)).toBe("Resolved");
    expect(rows[1]).toMatchObject({
      sessionId: "s2",
      callingNumber: "789",
      calledNumber: "1001",
      isArchived: true,
    });
  });
  it("uses the source application's case-sensitive query names and call variable keys", () => {
    expect(CALL_VARIABLES[0]).toBe("call_variable1");
    expect(
      buildRecordingParams({
        AgentName: " Sana ",
        customerNumber: "123",
        agentExtension: "1001",
        callVariableKey: CALL_VARIABLES[9],
        callVariableValue: "case-1",
        tagId: 0,
        offset: 0,
      }),
    ).toEqual({
      AgentName: "Sana",
      customerNumber: "123",
      agentExtension: "1001",
      callVariableKey: "call_variable10",
      callVariableValue: "case-1",
      tagId: 0,
      offset: 0,
    });
  });
  it("rewrites stored hosts and rejects arbitrary credential destinations", () => {
    setConfig(makeConfig({ VRS_URL: "https://configured.example" }));
    expect(resolveRecordingUrl("https://old.example/recording/download/s1", "Sana", "DOWNLOAD", "mp3")).toBe(
      "https://configured.example/vrs/recording/download/s1?username=Sana&action=DOWNLOAD&outputFormat=mp3",
    );
    expect(() => resolveRecordingUrl("https://other.example/collect-token", "Sana")).toThrow(
      "Unsupported recording URL",
    );
  });
});
