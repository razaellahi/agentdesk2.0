import { create } from "zustand";
import type { KnowledgeBaseHit } from "../api";

const MAX_HITS = 6;

interface KnowledgeState {
  /** Answers found so far in a conversation, newest first. */
  hits: Record<string, KnowledgeBaseHit[]>;
  /** The answer open across the whole panel, by conversation (its query). */
  expanded: Record<string, string | null>;
  /** Searching takes the whole Customer Info panel; the agent can hand it back. */
  focused: Record<string, boolean>;
  addHit(conversationId: string, hit: KnowledgeBaseHit): void;
  expand(conversationId: string, query: string | null): void;
  setFocused(conversationId: string, focused: boolean): void;
  clear(conversationId: string): void;
}

/** Results live here, not in the section, so they stay while the agent moves between panel tabs. */
export const useKnowledgeStore = create<KnowledgeState>()((set) => ({
  hits: {},
  expanded: {},
  focused: {},
  addHit(conversationId, hit) {
    set((state) => ({
      hits: {
        ...state.hits,
        [conversationId]: [
          hit,
          ...(state.hits[conversationId] ?? []).filter((row) => row.query !== hit.query),
        ].slice(0, MAX_HITS),
      },
    }));
  },
  expand(conversationId, query) {
    set((state) => ({ expanded: { ...state.expanded, [conversationId]: query } }));
  },
  setFocused(conversationId, focused) {
    set((state) => ({ focused: { ...state.focused, [conversationId]: focused } }));
  },
  clear(conversationId) {
    set((state) => ({
      hits: { ...state.hits, [conversationId]: [] },
      expanded: { ...state.expanded, [conversationId]: null },
      focused: { ...state.focused, [conversationId]: false },
    }));
  },
}));
