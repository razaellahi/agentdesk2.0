import { create } from "zustand";
import { getConfig, hasConfig } from "@/config";
import { isFeatureEnabled } from "@/config/featureFlags";

/** Most panes the board shows at once: MAX_BOARD_PANES (1–3), or 1 without the board flag. */
export function maxPanes() {
  if (!isFeatureEnabled("multiPaneBoard")) return 1;
  const max = (hasConfig() ? getConfig().MAX_BOARD_PANES : 3) || 3;
  return Math.min(3, Math.max(1, max));
}

export type BesideResult =
  { ok: true; replaced: string | null; previous: string[] } | { ok: false; reason: "pinned" };

interface BoardState {
  /** Conversations on the board, in pane order. The board is as wide as the agent's selection. */
  panes: string[];
  focus: number;
  pinned: string[];
  /** Pane conversations, most recently focused first (picks the pane a full board gives up). */
  recent: string[];
  focusPane: (index: number) => void;
  /** Plain open: focus it if shown, otherwise show it in the focused pane (or another unpinned one). */
  open: (conversationId: string) => boolean;
  /** Show beside the current panes; on a full board the least recently used unpinned pane makes room. */
  openBeside: (conversationId: string) => BesideResult;
  /** Remove a conversation's pane; the conversation stays in the list. */
  remove: (conversationId: string) => void;
  close: (index: number) => void;
  swap: (index: number, target: number) => void;
  togglePin: (id: string) => void;
  /** Undo a replacement made by `openBeside`. */
  restore: (panes: string[], focusId: string | null) => void;
  reconcile: (ids: string[]) => void;
  reset: () => void;
}

const touch = (recent: string[], id: string) => [id, ...recent.filter((r) => r !== id)];

export const useBoardStore = create<BoardState>()((set, get) => ({
  panes: [],
  focus: 0,
  pinned: [],
  recent: [],
  focusPane(index) {
    const id = get().panes[index];
    if (id) set((s) => ({ focus: index, recent: touch(s.recent, id) }));
  },
  open(id) {
    const { panes, focus, pinned, recent } = get();
    const existing = panes.indexOf(id);
    if (existing >= 0) {
      set({ focus: existing, recent: touch(recent, id) });
      return true;
    }
    if (!panes.length) {
      set({ panes: [id], focus: 0, recent: [id] });
      return true;
    }
    const target = !pinned.includes(panes[focus] ?? "") ? focus : panes.findIndex((p) => !pinned.includes(p));
    if (target < 0) {
      // Every pane is pinned: use a free slot rather than refusing.
      if (panes.length >= maxPanes()) return false;
      set({ panes: [...panes, id], focus: panes.length, recent: touch(recent, id) });
      return true;
    }
    const next = [...panes];
    next[target] = id;
    set({ panes: next, focus: target, recent: touch(recent, id).filter((r) => next.includes(r)) });
    return true;
  },
  openBeside(id) {
    const { panes, focus, pinned, recent } = get();
    const existing = panes.indexOf(id);
    if (existing >= 0) {
      set({ focus: existing, recent: touch(recent, id) });
      return { ok: true, replaced: null, previous: panes };
    }
    if (panes.length < maxPanes()) {
      const at = panes.length ? focus + 1 : 0;
      const next = [...panes.slice(0, at), id, ...panes.slice(at)];
      set({ panes: next, focus: at, recent: touch(recent, id) });
      return { ok: true, replaced: null, previous: panes };
    }
    // Full board: give up the least recently used pane that is neither pinned nor focused.
    const candidates = panes.filter((p, i) => !pinned.includes(p) && (i !== focus || panes.length === 1));
    const victim =
      [...recent].reverse().find((r) => candidates.includes(r)) ?? candidates[candidates.length - 1];
    if (!victim) return { ok: false, reason: "pinned" };
    const index = panes.indexOf(victim);
    const next = [...panes];
    next[index] = id;
    set({ panes: next, focus: index, recent: touch(recent, id).filter((r) => next.includes(r)) });
    return { ok: true, replaced: victim, previous: panes };
  },
  remove(id) {
    const index = get().panes.indexOf(id);
    if (index >= 0) get().close(index);
  },
  close(index) {
    set((s) => {
      const id = s.panes[index];
      if (!id) return s;
      const panes = s.panes.filter((_, i) => i !== index);
      const focus = Math.max(0, Math.min(index <= s.focus ? s.focus - 1 : s.focus, panes.length - 1));
      return {
        panes,
        focus: panes.length ? focus : 0,
        pinned: s.pinned.filter((p) => p !== id),
        recent: s.recent.filter((r) => r !== id),
      };
    });
  },
  swap(index, target) {
    const { panes } = get();
    if (index < 0 || target < 0 || index >= panes.length || target >= panes.length) return;
    const next = [...panes];
    [next[index], next[target]] = [next[target]!, next[index]!];
    set({ panes: next, focus: target });
  },
  togglePin(id) {
    set((s) => ({ pinned: s.pinned.includes(id) ? s.pinned.filter((p) => p !== id) : [...s.pinned, id] }));
  },
  restore(panes, focusId) {
    const index = focusId ? panes.indexOf(focusId) : -1;
    set((s) => ({
      panes,
      focus: index >= 0 ? index : 0,
      recent: s.recent.filter((r) => panes.includes(r)),
    }));
  },
  reconcile(ids) {
    const known = new Set(ids);
    set((s) => {
      const panes = s.panes.filter((id) => known.has(id));
      if (panes.length === s.panes.length) return s;
      const focused = s.panes[s.focus];
      const focus = focused ? panes.indexOf(focused) : -1;
      return {
        panes,
        focus: focus >= 0 ? focus : Math.max(0, Math.min(s.focus, panes.length - 1)),
        pinned: s.pinned.filter((id) => known.has(id)),
        recent: s.recent.filter((id) => known.has(id)),
      };
    });
  },
  reset() {
    set({ focus: 0, panes: [], pinned: [], recent: [] });
  },
}));
export const useBoardEnabled = () => isFeatureEnabled("multiPaneBoard");

/** The workspace needs its width: the shell folds its nav to icons there. */
export function useBoardWantsRoom(onWorkspace: boolean) {
  return onWorkspace;
}
