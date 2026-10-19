import { describe, expect, it } from "vitest";
import { mayMarkSeen } from "./seen";
import { conversationFixture } from "@/test/conversations";
import type { CimMessage } from "../model/types";
describe("visible conversation read receipts", () => {
  it("does not mark background, scrolled-up, monitored or past-history messages read", () => {
    const c = conversationFixture();
    const message: CimMessage = {
      id: "m1",
      header: { sender: { type: "CUSTOMER", id: "customer" } },
      body: { type: "PLAIN" },
    };
    const context = { focused: true, visible: true, atBottom: true };
    expect(mayMarkSeen(c, message, context)).toBe(true);
    for (const key of ["focused", "visible", "atBottom"] as const)
      expect(mayMarkSeen(c, message, { ...context, [key]: false })).toBe(false);
    for (const role of ["SILENT_MONITOR", "ASSISTANT"])
      expect(mayMarkSeen({ ...c, topicParticipant: { ...c.topicParticipant, role } }, message, context)).toBe(
        false,
      );
    expect(mayMarkSeen({ ...c, roomInfo: "FAKE_CONVERSATION", state: "CLOSED" }, message, context)).toBe(
      false,
    );
    expect(
      mayMarkSeen(
        c,
        {
          ...message,
          header: { sender: { type: "AGENT", id: c.topicParticipant.participant.keycloakUser.id } },
        },
        context,
      ),
    ).toBe(false);
  });
});
