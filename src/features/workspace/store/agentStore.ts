import { create } from "zustand";

export interface ReasonCode {
  id: string;
  name: string;
  description?: string;
  type: "NOT_READY" | "LOGOUT" | string;
  code?: number;
}

export interface AgentMrdState {
  mrd: { id: string; name: string; [key: string]: unknown };
  state: string;
  [key: string]: unknown;
}

export interface AgentPresence {
  state: { name: string | null; reasonCode?: ReasonCode | null };
  agentMrdStates: AgentMrdState[];
  stateChangeTime?: string;
  [key: string]: unknown;
}

interface AgentState {
  presence: AgentPresence | null;
  /** Local time the current state started (for the elapsed-state timer). */
  stateSince: number | null;
  /** When this browser session became an agent session (logged-in clock). */
  loginAt: number | null;
  /** Time already spent in Ready / Not Ready before the current state. */
  readyMs: number;
  notReadyMs: number;
  reasonCodes: ReasonCode[];
  /** True while a state change request is in flight (disables the controls, as before). */
  pending: boolean;
  setPresence(presence: AgentPresence): void;
  markLogin(at?: number): void;
  setReasonCodes(codes: ReasonCode[]): void;
  setPending(pending: boolean): void;
  reset(): void;
}

function bucket(name: string | null | undefined) {
  const state = String(name ?? "").toUpperCase();
  if (state === "READY") return "ready" as const;
  if (state === "NOT_READY") return "notReady" as const;
  return null;
}

export const useAgentStore = create<AgentState>()((set, get) => ({
  presence: null,
  stateSince: null,
  loginAt: null,
  readyMs: 0,
  notReadyMs: 0,
  reasonCodes: [],
  pending: false,
  setPresence(presence) {
    const prev = get().presence;
    // Restart the timer when the state actually changed (app-header reStartTimer rules).
    const changed = !prev?.state?.name || prev.stateChangeTime !== presence.stateChangeTime;
    const since = presence.stateChangeTime ? Date.parse(presence.stateChangeTime) : NaN;
    const now = Date.now();
    let { readyMs, notReadyMs } = get();
    if (changed && prev?.state?.name && get().stateSince) {
      const delta = Math.max(0, now - (get().stateSince as number));
      const previous = bucket(prev.state.name);
      if (previous === "ready") readyMs += delta;
      if (previous === "notReady") notReadyMs += delta;
    }
    set({
      presence,
      pending: false,
      readyMs,
      notReadyMs,
      stateSince: changed ? (Number.isFinite(since) ? since : now) : get().stateSince,
    });
  },
  markLogin(at = Date.now()) {
    if (get().loginAt == null) set({ loginAt: at });
  },
  setReasonCodes: (reasonCodes) => set({ reasonCodes }),
  setPending: (pending) => set({ pending }),
  reset: () =>
    set({
      presence: null,
      stateSince: null,
      loginAt: null,
      readyMs: 0,
      notReadyMs: 0,
      reasonCodes: [],
      pending: false,
    }),
}));

/** MRD toggle is "on" for these states (getmrdswitches pipe). */
export const isMrdOn = (state: string | undefined) =>
  ["ready", "active", "busy", "reserved", "ob_reserved"].includes(String(state ?? "").toLowerCase());

/**
 * Logout is blocked while the agent is READY or any channel is not NOT_READY
 * (app-header checkAgentState).
 */
export function logoutBlocked(presence: AgentPresence | null): "state" | "active" | null {
  if (!presence?.state?.name) return null;
  const anyBusy = (presence.agentMrdStates ?? []).some((m) => m.state !== "NOT_READY");
  if (presence.state.name === "READY") return "state";
  if (presence.state.name === "NOT_READY" && anyBusy) return "active";
  return null;
}
