import { create } from "zustand";

/** A point in a conversation's transcript to bring into view: the message nearest this time. */
export interface TranscriptTarget {
  conversationId: string;
  /** Epoch milliseconds. */
  at: number;
}

interface TranscriptFocusState {
  target: TranscriptTarget | null;
  focus: (target: TranscriptTarget) => void;
  clear: () => void;
}

/** Set when something outside the transcript (a case, a link) opens a conversation at a moment. */
export const useTranscriptFocus = create<TranscriptFocusState>((set) => ({
  target: null,
  focus: (target) => set({ target }),
  clear: () => set({ target: null }),
}));
