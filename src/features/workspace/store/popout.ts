import { create } from "zustand";
import { can } from "@/core/auth";
import { getConversation, useConversationStore } from "./conversationStore";
import { useBoardStore } from "./boardStore";

/**
 * In-tab conversation windows. A real browser tab boots a second Agent Desk
 * session and the contact center logs the first one out.
 */
export const usePopoutStore = create<{
  ids: string[];
  open: (conversationId: string) => void;
  remove: (id: string) => void;
  mergeBack: (id: string) => void;
  closeAll: () => void;
}>((set, get) => ({
  ids: [],
  open(conversationId) {
    if (!can("conversations") || !getConversation(conversationId)) return;
    const ids = get().ids.filter((id) => id !== conversationId);
    set({ ids: [...ids, conversationId] });
  },
  remove: (id) => set({ ids: get().ids.filter((entry) => entry !== id) }),
  mergeBack(id) {
    get().remove(id);
    useConversationStore.getState().setActive(id);
    useBoardStore.getState().open(id);
  },
  closeAll: () => set({ ids: [] }),
}));

export function openConversationPopout(conversationId: string): boolean {
  usePopoutStore.getState().open(conversationId);
  return usePopoutStore.getState().ids.includes(conversationId);
}

export function mergeConversationBack(conversationId: string) {
  usePopoutStore.getState().mergeBack(conversationId);
}
