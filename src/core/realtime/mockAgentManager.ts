interface MockPresence {
  state: { name: string; reasonCode?: unknown };
  agentMrdStates: { mrd: { id: string; name: string }; state: string }[];
  stateChangeTime: string;
}

type Dispatch = (event: string, ...args: unknown[]) => void;

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
        for (const chat of demoLiveConversations(this.agent))
          this.dispatch("onTopicData", chat, () => undefined);
      });
    }, 0);
  }

  emit(event: string, payload: unknown) {
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
}
