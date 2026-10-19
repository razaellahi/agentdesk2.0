import { describe, expect, it } from "vitest";
import { activityCustomerNumber, canPlayActivityRecording } from "./voiceActivity";
describe("voice activity permissions", () => {
  it("uses customer ANI from the main leg, and restricts recordings to participating agents", () => {
    const legs = [
      {
        startDirection: "INBOUND",
        sender: { id: "agent-a" },
        additionalDetail: { dialog: { ani: "03001234567" } },
      },
      { startDirection: "CONSULT", sender: { id: "agent-b" }, additionalDetail: { customerNumber: "1002" } },
    ];
    expect(activityCustomerNumber(legs)).toBe("03001234567");
    expect(canPlayActivityRecording(false, true, "agent-c", legs)).toBe(false);
    expect(canPlayActivityRecording(false, true, "agent-b", [legs[0]!])).toBe(false);
    expect(canPlayActivityRecording(false, true, "agent-b", legs)).toBe(true);
    expect(canPlayActivityRecording(true, false, "agent-c", legs)).toBe(true);
    expect(canPlayActivityRecording(false, false, "agent-a", legs)).toBe(false);
  });
});
