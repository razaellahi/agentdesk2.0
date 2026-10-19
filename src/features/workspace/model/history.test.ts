import { describe, expect, it } from "vitest";
import { historyConversation } from "./history";
import type { CimEvent } from "./types";

const customer = { _id: "c1", firstName: "Amina" };
const user = { id: "u1", username: "agent" };
const ctx = { agentId: "u1", agentUsername: "agent", t: (key: string) => key, now: 1_000 };

const message = (id: string, text: string, timestamp: number): CimEvent =>
  ({
    id,
    name: "CUSTOMER_MESSAGE",
    type: "MESSAGE",
    timestamp,
    data: {
      id,
      header: { timestamp, sender: { type: "CUSTOMER", id: "c1", senderName: "Amina" } },
      body: { type: "PLAIN", markdownText: text },
    },
  }) as unknown as CimEvent;

describe("historyConversation", () => {
  it("builds messages oldest first", () => {
    const history = historyConversation(
      [message("m2", "second", 20), message("m1", "first", 10)],
      customer,
      user,
      ctx,
    );
    expect(history.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(history.composerEnabled).toBe(false);
  });

  it("shows an activity once when the server returns it on two pages", () => {
    const history = historyConversation(
      [message("m1", "first", 10), message("m1", "first", 10)],
      customer,
      user,
      ctx,
    );
    expect(history.messages.filter((m) => m.id === "m1")).toHaveLength(1);
  });

  it("is a read-only, closed conversation for the opened customer", () => {
    const history = historyConversation([message("m1", "first", 10)], customer, user, ctx);
    expect(history.roomInfo).toBe("FAKE_CONVERSATION");
    expect(history.state).toBe("CLOSED");
    expect(history.customer._id).toBe("c1");
    expect(history.topicParticipant.role).toBe("SILENT_MONITOR");
  });

  it("skips an event with an unexpected shape instead of failing the whole history", () => {
    const broken = {
      id: "bad",
      name: "CUSTOMER_MESSAGE",
      type: "MESSAGE",
      timestamp: 15,
      data: { header: {} },
    } as unknown as CimEvent;
    const history = historyConversation(
      [message("m1", "first", 10), broken, message("m2", "second", 20)],
      customer,
      user,
      ctx,
    );
    expect(history.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("ignores null and non-object entries in the server's list", () => {
    const hostile = [null, undefined, 5, "text", message("m1", "hi", 10)] as unknown as CimEvent[];
    const history = historyConversation(hostile, customer, user, ctx);
    expect(history.messages.map((m) => m.id)).toEqual(["m1"]);
  });

  it("copes with events that carry no data at all", () => {
    const empty = { id: "e", name: "AGENT_MESSAGE", timestamp: 5 } as unknown as CimEvent;
    expect(() => historyConversation([empty, message("m1", "hi", 10)], customer, user, ctx)).not.toThrow();
  });
});
