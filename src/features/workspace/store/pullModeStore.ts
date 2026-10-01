import { create } from "zustand";
import type { PullRequest } from "./requestStore";

export interface PullModeList {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface PullModeState {
  lists: PullModeList[];
  listNames: Record<string, string>;
  subscribed: unknown[];
  requests: (PullRequest & { status?: string })[];
  setLists(lists: PullModeList[]): void;
  setSubscribed(list: unknown[]): void;
  setRequests(requests: PullRequest[]): void;
  addRequests(requests: PullRequest[]): void;
  removeRequestsOfList(listId: string): void;
  /** Returns "opened" for a brand new request (shows the pull notification). */
  upsertRequest(request: PullRequest & { status?: string }, type: string): "opened" | "updated" | "closed";
  reset(): void;
}

/** Pull-mode lists and their requests (unified-agent pullModeService). */
export const usePullModeStore = create<PullModeState>()((set, get) => ({
  lists: [],
  listNames: {},
  subscribed: [],
  requests: [],
  setLists: (lists) => set({ lists, listNames: Object.fromEntries(lists.map((l) => [l.id, l.name])) }),
  setSubscribed: (subscribed) => set({ subscribed }),
  setRequests: (requests) => set({ requests }),
  addRequests: (incoming) =>
    set((s) => ({
      requests: [...s.requests, ...incoming.filter((r) => !s.requests.some((e) => e.id === r.id))],
    })),
  removeRequestsOfList: (listId) => set((s) => ({ requests: s.requests.filter((r) => r.listId !== listId) })),
  upsertRequest(request, type) {
    if (
      type.toUpperCase() !== "PULL_MODE_LIST_REQUEST_RECEIVED" &&
      String(request.status ?? "").toLowerCase() === "closing"
    ) {
      set((s) => ({ requests: s.requests.filter((r) => r.id !== request.id) }));
      return "closed";
    }
    const exists = get().requests.some((r) => r.id === request.id);
    set((s) => ({
      requests: exists
        ? s.requests.map((r) => (r.id === request.id ? request : r))
        : [...s.requests, request],
    }));
    return exists ? "updated" : "opened";
  },
  reset: () => set({ lists: [], listNames: {}, subscribed: [], requests: [] }),
}));
