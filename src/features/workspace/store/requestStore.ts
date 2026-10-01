import { create } from "zustand";
import type { ChannelSession } from "../model/types";

/** taskRequest payload for push-mode offers, transfers, conferences and consults. */
export interface PushRequest {
  conversationId: string;
  roomInfo: unknown;
  taskId: string;
  taskDirection?: string;
  requestedBy?: string;
  note?: string;
  channelSession: ChannelSession;
  cisco_data?: unknown;
  [key: string]: unknown;
}

export interface PullRequest {
  id: string;
  listId: string;
  channelSession: ChannelSession;
  [key: string]: unknown;
}

export interface HandRaiseNotice {
  id: string;
  event: { conversationId: string; channelSession?: ChannelSession; [key: string]: unknown };
  agentName?: string;
  [key: string]: unknown;
}

interface RequestState {
  push: PushRequest[];
  pull: PullRequest[];
  handRaises: HandRaiseNotice[];
  addPush(request: PushRequest): void;
  removePush(conversationId: string): void;
  clearPush(): void;
  addPull(request: PullRequest): void;
  removePull(requestId: string): void;
  clearPull(): void;
  addHandRaise(notice: HandRaiseNotice): void;
  removeHandRaise(conversationId: string): void;
  reset(): void;
}

export const useRequestStore = create<RequestState>()((set) => ({
  push: [],
  pull: [],
  handRaises: [],
  addPush: (r) =>
    set((s) => ({
      push: s.push.some((p) => p.conversationId === r.conversationId) ? s.push : [...s.push, r],
    })),
  removePush: (id) => set((s) => ({ push: s.push.filter((p) => p.conversationId !== id) })),
  clearPush: () => set({ push: [] }),
  addPull: (r) => set((s) => ({ pull: s.pull.some((p) => p.id === r.id) ? s.pull : [...s.pull, r] })),
  removePull: (id) => set((s) => ({ pull: s.pull.filter((p) => p.id !== id) })),
  clearPull: () => set({ pull: [] }),
  addHandRaise: (n) =>
    set((s) => ({
      handRaises: s.handRaises.some((h) => h.event.conversationId === n.event.conversationId)
        ? s.handRaises
        : [...s.handRaises, n],
    })),
  removeHandRaise: (id) =>
    set((s) => ({ handRaises: s.handRaises.filter((h) => h.event.conversationId !== id) })),
  reset: () => set({ push: [], pull: [], handRaises: [] }),
}));
