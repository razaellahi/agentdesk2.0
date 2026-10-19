import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { applyCimEvent, type Effect } from "../model/cimEvents";
import { buildConversation, type ModelContext, type TopicDataPayload } from "../model/conversation";
import type { CimEvent, CimMessage, Conversation } from "../model/types";

interface ConversationState {
  byId: Record<string, Conversation>;
  /** Rail order (arrival order, as in unified-agent's tab order). */
  order: string[];
  /** The conversation the agent is looking at (1-up) / focused pane (board). */
  activeId: string | null;
  seq: number;
}

interface ConversationActions {
  upsertFromTopicData(payload: TopicDataPayload, ctx: ModelContext): { isNew: boolean };
  applyEvent(conversationId: string, event: CimEvent, ctx: ModelContext): Effect[] | null;
  remove(conversationId: string): Conversation | null;
  setActive(conversationId: string | null): void;
  markRead(conversationId: string): void;
  /** Optimistic local message (status "sending") added when the agent sends. */
  addLocalMessage(conversationId: string, message: CimMessage): void;
  updateTaskId(conversationId: string, taskId: string): void;
  selectReplySession(conversationId: string, sessionId: string): void;
  showWrapUp(conversationId: string, durationSeconds: number, now: number): void;
  hideWrapUp(conversationId: string): void;
  closeSlaPopup(conversationId: string): void;
  setCustomer(conversationId: string, customer: Conversation["customer"]): void;
  reset(): void;
}

const initial: ConversationState = { byId: {}, order: [], activeId: null, seq: 0 };

export const useConversationStore = create<ConversationState & ConversationActions>()(
  immer((set, get) => ({
    ...initial,

    upsertFromTopicData(payload, ctx) {
      const existing = get().byId[payload.conversationId];
      // A reload replaces the "fake" history view for the same customer, as before.
      const fake = Object.values(get().byId).find(
        (c) => c.roomInfo === "FAKE_CONVERSATION" && c.customer._id === payload.topicData.customer._id,
      );
      const isNew = !existing && !fake;
      set((s) => {
        const seq = existing?.seq ?? fake?.seq ?? ++s.seq;
        const next = buildConversation(payload, ctx, seq);
        if (fake && fake.conversationId !== next.conversationId) {
          delete s.byId[fake.conversationId];
          s.order = s.order.map((id) => (id === fake.conversationId ? next.conversationId : id));
          if (s.activeId === fake.conversationId) s.activeId = next.conversationId;
        }
        if (existing && next.roomInfo === "FAKE_CONVERSATION") return;
        s.byId[next.conversationId] = next;
        if (!s.order.includes(next.conversationId)) s.order.push(next.conversationId);
        s.activeId ??= next.conversationId;
      });
      return { isNew };
    },

    applyEvent(conversationId, event, ctx) {
      if (!get().byId[conversationId]) return null;
      let effects: Effect[] = [];
      set((s) => {
        const c = s.byId[conversationId];
        if (c) {
          effects = applyCimEvent(c, event, ctx);
        }
      });
      return effects;
    },

    remove(conversationId) {
      const target =
        get().byId[conversationId] ??
        Object.values(get().byId).find((c) => c.customer._id === conversationId) ??
        null;
      if (!target) return null;
      set((s) => {
        delete s.byId[target.conversationId];
        s.order = s.order.filter((id) => id !== target.conversationId);
        if (s.activeId === target.conversationId) s.activeId = s.order[0] ?? null;
      });
      return target;
    },

    setActive(conversationId) {
      set((s) => {
        s.activeId = conversationId;
      });
    },

    markRead(conversationId) {
      set((s) => {
        const c = s.byId[conversationId];
        if (c && c.unread) c.unread = 0;
      });
    },

    addLocalMessage(conversationId, message) {
      set((s) => {
        const c = s.byId[conversationId];
        if (!c) return;
        c.messages.push(message);
        c.lastMessageAt = Number(message.header.timestamp) || Date.now();
        if (!message.body.isWhisper) c.waitingSince = null;
      });
    },

    updateTaskId(conversationId, taskId) {
      set((s) => {
        const c = s.byId[conversationId];
        if (c) c.taskId = taskId;
      });
    },

    selectReplySession(conversationId, sessionId) {
      set((s) => {
        const c = s.byId[conversationId];
        if (!c) return;
        c.activeChannelSessions.forEach((session) => (session.isChecked = session.id === sessionId));
      });
    },

    showWrapUp(conversationId, durationSeconds, now) {
      set((s) => {
        const c = s.byId[conversationId];
        if (!c) return;
        c.wrapUp = { show: true, deadline: now + durationSeconds * 1000 };
        c.sla.popup = false;
      });
    },

    hideWrapUp(conversationId) {
      set((s) => {
        const c = s.byId[conversationId];
        if (c) c.wrapUp = { show: false, deadline: null };
      });
    },

    setCustomer(conversationId, customer) {
      set((s) => {
        const c = s.byId[conversationId];
        if (c) c.customer = customer;
      });
    },

    closeSlaPopup(conversationId) {
      set((s) => {
        const c = s.byId[conversationId];
        if (c) c.sla.popup = false;
      });
    },

    reset() {
      set(() => ({ ...initial }));
    },
  })),
);

// --- selectors (per-slice so a message in one conversation re-renders only its subscribers)
export const useConversation = (id: string | null | undefined) =>
  useConversationStore((s) => (id ? s.byId[id] : undefined));
export const useConversationOrder = () => useConversationStore((s) => s.order);
export const useActiveConversationId = () => useConversationStore((s) => s.activeId);
export const getConversation = (id: string) => useConversationStore.getState().byId[id];
