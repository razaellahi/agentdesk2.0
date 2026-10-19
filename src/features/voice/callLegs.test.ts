import { describe, expect, it } from "vitest";
import { buildCallLegMessage } from "./callLegs";
describe("voice history contract", () => {
  it("keeps provider timestamps, leg identity and conversation correlation", () => {
    const dialog = {
      id: "call-1",
      customerNumber: "123",
      serviceIdentifier: "voice-service",
      participants: [
        {
          mediaAddress: "1001",
          startTime: "2026-10-01T10:00:01Z",
          alertingTime: "2026-10-01T10:00:00Z",
          stateChangeTime: "2026-10-01T10:01:00Z",
        },
      ],
      callEndReason: "AGENT-HANDLED",
      callVariables: { CallVariable: [{ name: "callVariable1", value: "case-1" }] },
    };
    const message = buildCallLegMessage(
      dialog,
      "CALL_LEG_ENDED",
      { conversationId: "conversation-1" },
      { id: "agent-1", username: "agent" },
      "1001",
      "INBOUND",
      999,
    );
    expect(message.header.timestamp).toBe(Date.parse("2026-10-01T10:01:00Z"));
    expect(message.header.channelData.additionalAttributes).toContainEqual({
      key: "conversationId",
      type: "String2000",
      value: "conversation-1",
    });
    expect(message.body).toMatchObject({
      type: "VOICE",
      callId: "call-1",
      leg: `call-1:1001:123:${Date.parse("2026-10-01T10:00:00Z")}`,
      endingReason: "AGENT",
    });
  });
  it("uses a stable fallback leg time across hold and resume callbacks", () => {
    const dialog = { id: "call-1", customerNumber: "123" },
      user = { id: "a", username: "a" };
    const hold = buildCallLegMessage(dialog, "CALL_HOLD", {}, user, "1001", "INBOUND", 2000, 1000);
    const resume = buildCallLegMessage(dialog, "CALL_RESUME", {}, user, "1001", "INBOUND", 5000, 1000);
    expect(hold.body.leg).toBe(resume.body.leg);
    expect(hold.header.timestamp).not.toBe(resume.header.timestamp);
  });
});
