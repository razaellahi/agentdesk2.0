import { beforeEach, describe, expect, it, vi } from "vitest";
import { conversationFixture } from "@/test/conversations";
import type { AgentParticipant, ChannelSession, Conversation } from "../model/types";
import { useConversationStore } from "../store/conversationStore";
import { assistanceBlock, completeConsult, requestAssistance, type LiveCall } from "./assistance";

const mocks = vi.hoisted(() => ({ emit: vi.fn(), crm: vi.fn() }));
vi.mock("@/core/auth", () => ({ can: () => true }));
vi.mock("@/core/realtime", () => ({ socketManager: { connected: true, emit: mocks.emit } }));
vi.mock("@/core/crm-bridge", () => ({ postCrmEvent: mocks.crm }));

const chatOnly = { cxVoice: false, cisco: false };
const cx = { cxVoice: true, cisco: false };
const noCall: LiveCall = { dialogIds: [], conference: false, consulting: false, webRtc: false };
const onCall: LiveCall = { ...noCall, dialogIds: ["dialog-1"] };

function voiceSession(): ChannelSession {
  return {
    id: "voice-1",
    channel: { id: "cx", channelType: { name: "CX_VOICE" } },
    channelData: { channelCustomerIdentifier: "+100", serviceIdentifier: "line" },
    isChecked: false,
    isDisabled: true,
  };
}

function assistant(id: string): AgentParticipant {
  return {
    role: "ASSISTANT",
    participant: { id, participantType: "CCUser", keycloakUser: { id, username: id } },
  } as AgentParticipant;
}

function store(c: Conversation) {
  useConversationStore.setState({ byId: { [c.conversationId]: c } });
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
  useConversationStore.setState({ byId: {}, order: [], activeId: null });
});

describe("agent assistance", () => {
  it("is for the primary agent only, and not during a chat conference", () => {
    const c = conversationFixture();
    expect(assistanceBlock(c, noCall, chatOnly)).toBeNull();
    c.webConference = true;
    expect(assistanceBlock(c, noCall, chatOnly)).toBe("web-conference");
    c.webConference = false;
    c.topicParticipant.role = "ASSISTANT";
    expect(assistanceBlock(c, noCall, chatOnly)).toBe("role");
  });

  it("needs the CX Voice call, and waits out a consult or conference on it", () => {
    const c = conversationFixture();
    c.activeChannelSessions.push(voiceSession());
    expect(assistanceBlock(c, noCall, cx)).toBe("no-call");
    expect(assistanceBlock(c, onCall, cx)).toBeNull();
    expect(assistanceBlock(c, { ...onCall, consulting: true }, cx)).toBe("consulting");
    expect(assistanceBlock(c, { ...onCall, conference: true }, cx)).toBe("conference");
    // A chat conference flag does not hold up a voice conversation; the call decides.
    c.webConference = true;
    expect(assistanceBlock(c, onCall, cx)).toBeNull();
  });

  it("hands a CX Voice call to a named agent through the call's session, not an offer", () => {
    const c = store(conversationFixture());
    c.activeChannelSessions.push(voiceSession());
    expect(requestAssistance(c, "consult", { mode: "agent", agentId: "agent-2" }, "", onCall, cx)).toBe(true);
    expect(mocks.emit).toHaveBeenCalledWith(
      "consultRequest",
      expect.objectContaining({
        channelSession: expect.objectContaining({ id: "voice-1" }),
        requestedAgentId: "agent-2",
        offerToAgent: false,
      }),
    );
    expect(mocks.crm).toHaveBeenCalledWith(expect.objectContaining({ taskType: "Consult" }));
  });

  it("offers a chat transfer to the named agent on the conversation's first session", () => {
    const c = store(conversationFixture());
    expect(
      requestAssistance(c, "transfer", { mode: "agent", agentId: "agent-2" }, "", noCall, chatOnly),
    ).toBe(true);
    expect(mocks.emit).toHaveBeenCalledWith(
      "directTransferRequest",
      expect.objectContaining({ channelSession: c.firstChannelSession, offerToAgent: true }),
    );
  });

  it("completes a consult with the consulted agent the primary chose", () => {
    const c = store(conversationFixture());
    c.agentParticipants = [assistant("first"), assistant("second")];
    expect(completeConsult(c, "transfer", c.agentParticipants[1]!)).toBe(true);
    expect(mocks.emit).toHaveBeenCalledWith(
      "consultTransferRequest",
      expect.objectContaining({ requestedAgentId: "second", offerToAgent: false }),
    );
  });
});
