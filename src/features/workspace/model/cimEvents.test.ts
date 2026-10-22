import { describe, expect, it } from "vitest";
import { applyCimEvent } from "./cimEvents";
import type { ModelContext } from "./conversation";
import { decodeBase64, encodeBase64, messageText } from "./outgoing";
import type { CimMessage, Conversation } from "./types";

const ctx: ModelContext = { agentId: "agent-1", agentUsername: "agent", t: (key) => key, now: 5_000 };

function conversation(): Conversation {
  return {
    conversationId: "c1",
    roomInfo: { id: "r1" },
    taskId: "t1",
    state: "ACTIVE",
    seq: 1,
    customer: { _id: "cust", firstName: "Ada" },
    customerSuggestions: [],
    topicParticipant: {
      id: "tp",
      type: "AGENT",
      participant: {
        id: "agent-1",
        participantType: "CCUser",
        keycloakUser: { id: "agent-1", username: "agent" },
      },
      token: null,
      conversationId: "c1",
      role: "PRIMARY",
      userCredentials: null,
      state: "SUBSCRIBED",
    },
    firstChannelSession: null,
    activeChannelSessions: [],
    agentParticipants: [],
    webConference: false,
    messages: [],
    embeddedApps: [],
    activeConversationData: null,
    unread: 0,
    typingUntil: null,
    composerEnabled: false,
    handRaised: false,
    appliedWrapUps: [],
    aiContext: [],
    sla: { totalDuration: 30, deadline: null, color: "sla-normal", popup: false },
    wrapUp: { show: false, deadline: null },
    hold: { active: false, deadline: null },
    waitingSince: null,
    lastMessageAt: 0,
  };
}

describe("outgoing message text", () => {
  it("round-trips unicode through the agent encoding", () => {
    expect(decodeBase64(encodeBase64("héllo 😀"))).toBe("héllo 😀");
  });

  it("decodes only messages marked isEncoded", () => {
    const encoded = encodeBase64("hello");
    const message = {
      header: { sender: {}, additionalData: { isEncoded: true } },
      body: { type: "PLAIN", markdownText: encoded },
    } as unknown as CimMessage;
    expect(messageText(message)).toBe("hello");
    message.header.additionalData = { isEncoded: false };
    expect(messageText(message)).toBe(encoded);
  });
});

describe("applyCimEvent", () => {
  it("records a customer message, starts the SLA and marks them waiting", () => {
    const current = conversation();
    const effects = applyCimEvent(
      current,
      {
        name: "CUSTOMER_MESSAGE",
        data: {
          id: "m1",
          header: { sender: { type: "CUSTOMER", id: "cust", senderName: "Ada" }, timestamp: 1_000 },
          body: { type: "PLAIN", markdownText: "hello" },
        },
      },
      ctx,
    );
    expect(current.messages).toHaveLength(1);
    expect(current.unread).toBe(1);
    expect(current.waitingSince).toBe(1_000);
    expect(current.sla.deadline).toBe(5_000 + 30_000);
    expect(effects.some((effect) => effect.kind === "incomingMessage")).toBe(true);
  });

  it("stops the SLA when the agent replies", () => {
    const current = conversation();
    current.sla.deadline = 9_000;
    applyCimEvent(
      current,
      {
        name: "AGENT_MESSAGE",
        data: {
          id: "m2",
          header: { sender: { type: "AGENT", id: "agent-1", senderName: "agent" }, timestamp: 2_000 },
          body: { type: "PLAIN", markdownText: "on it" },
        },
      },
      ctx,
    );
    expect(current.sla.deadline).toBeNull();
    expect(current.waitingSince).toBeNull();
  });

  it("does not count a bot reply as unread", () => {
    const current = conversation();
    applyCimEvent(
      current,
      {
        name: "BOT_MESSAGE",
        data: {
          id: "b1",
          header: { sender: { type: "BOT", id: "bot", senderName: "Bot" }, timestamp: 2_000 },
          body: { type: "PLAIN", markdownText: "Hi, how can I help?" },
        },
      },
      ctx,
    );
    expect(current.unread).toBe(0);
  });

  it("tracks a chat consult conference until no other agent works the conversation", () => {
    const current = conversation();
    const helper = {
      role: "PRIMARY",
      participant: {
        id: "agent-2",
        participantType: "CCUser",
        keycloakUser: { id: "agent-2", username: "helper" },
      },
    };
    current.agentParticipants = [helper as never];
    applyCimEvent(
      current,
      {
        name: "TASK_STATE_CHANGED",
        channelSession: { channel: { channelType: { name: "WEB" } } } as never,
        data: {
          task: {
            activeMedia: [{ type: { direction: "CONSULT_CONFERENCE", mode: "AGENT" }, state: "ACTIVE" }],
          },
        },
      },
      ctx,
    );
    expect(current.webConference).toBe(true);
    const effects = applyCimEvent(
      current,
      { name: "AGENT_UNSUBSCRIBED", data: { agentParticipant: helper } },
      ctx,
    );
    expect(current.webConference).toBe(false);
    expect(effects).toContainEqual({ kind: "whisperCheck", conversationId: "c1" });
  });
});
