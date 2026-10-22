interface MockPresence {
  state: { name: string; reasonCode?: unknown };
  agentMrdStates: { mrd: { id: string; name: string }; state: string }[];
  stateChangeTime: string;
}

type Dispatch = (event: string, ...args: unknown[]) => void;

interface DemoParticipant {
  type: string;
  role?: string;
  participant: { id?: string };
}

/**
 * `pnpm mock` has no agent-manager to connect to. This stands in for it: the agent is connected and
 * Ready, and a change of state (Ready, Not Ready with a reason, a channel's state, logout) is answered
 * with the presence the server would send, so the desk behaves normally without a socket.
 */
export class MockAgentManager {
  private presence: MockPresence = {
    state: { name: "READY" },
    agentMrdStates: [
      { mrd: { id: "mrd-chat", name: "Chat" }, state: "READY" },
      { mrd: { id: "mrd-voice", name: "Voice" }, state: "READY" },
    ],
    stateChangeTime: new Date().toISOString(),
  };
  /** The demo chats' participants, so a completed consult can change the consulted agent's role. */
  private participants = new Map<string, DemoParticipant[]>();

  constructor(
    private readonly dispatch: Dispatch,
    private readonly agent: { id: string; username: string },
  ) {}

  /** The connection and the agent's first presence, as the server sends them on login, then a few live chats. */
  start() {
    setTimeout(() => {
      this.dispatch("connect");
      this.dispatch("agentPresence", { agentPresence: this.presence });
      // `pnpm mock` opens with a few live chats (.env.mock); e2e seeds its own.
      if (import.meta.env.VITE_MOCK_LIVE_CHATS !== "true") return;
      void import("@/test/msw/liveConversations").then(({ demoLiveConversations }) => {
        for (const chat of demoLiveConversations(this.agent)) {
          const topic = chat as { conversationId: string; topicData: { participants: DemoParticipant[] } };
          this.participants.set(topic.conversationId, topic.topicData.participants);
          this.dispatch("onTopicData", chat, () => undefined);
        }
      });
    }, 0);
  }

  emit(event: string, payload: unknown) {
    if (event === "consultTransferRequest" || event === "consultConferenceRequest") {
      this.completeConsult(event, payload);
      return;
    }
    if (event !== "changeAgentState") return;
    const change = payload as {
      action?: string;
      mrdId?: string;
      state?: string | { name?: string; reasonCode?: unknown };
    };
    const now = new Date().toISOString();
    if (change.action === "agentMRDState" && typeof change.state === "string") {
      this.presence = {
        ...this.presence,
        agentMrdStates: this.presence.agentMrdStates.map((m) =>
          m.mrd.id === change.mrdId ? { ...m, state: change.state as string } : m,
        ),
        stateChangeTime: now,
      };
    } else if (change.action === "agentState" && typeof change.state === "object" && change.state?.name) {
      const { name, reasonCode } = change.state;
      this.presence = {
        ...this.presence,
        state: { name, ...(name === "READY" ? {} : { reasonCode: reasonCode ?? null }) },
        stateChangeTime: now,
      };
    } else return;
    this.dispatch("agentPresence", { agentPresence: this.presence });
  }

  /** A finished consult: the chat goes to the consulted agent, or they join it as a second primary. */
  private completeConsult(event: string, payload: unknown) {
    const request = payload as {
      conversationId?: string;
      requestedAgentId?: string;
      channelSession?: unknown;
    };
    const conversationId = request.conversationId;
    if (!conversationId) return;
    if (event === "consultTransferRequest") {
      setTimeout(
        () => this.dispatch("topicUnsubscription", { conversationId, reason: "CHAT TRANSFERRED" }),
        600,
      );
      return;
    }
    const consulted = this.participants
      .get(conversationId)
      ?.find((row) => row.type === "AGENT" && row.participant.id === request.requestedAgentId);
    if (!consulted) return;
    consulted.role = "PRIMARY";
    const cimEvent = (name: string, data: unknown) => ({
      conversationId,
      roomInfo: { id: `room-${conversationId}` },
      cimEvent: JSON.stringify({
        id: crypto.randomUUID(),
        name,
        type: "NOTIFICATION",
        timestamp: Date.now(),
        conversationId,
        channelSession: request.channelSession,
        data,
      }),
    });
    setTimeout(() => {
      this.dispatch(
        "onCimEvent",
        cimEvent("TASK_STATE_CHANGED", {
          task: {
            activeMedia: [{ type: { direction: "CONSULT_CONFERENCE", mode: "AGENT" }, state: "ACTIVE" }],
          },
        }),
      );
      this.dispatch(
        "onCimEvent",
        cimEvent("PARTICIPANT_ROLE_CHANGED", { conversationParticipant: consulted }),
      );
    }, 600);
  }
}
