import { useCallback, useSyncExternalStore } from "react";

/**
 * One shared 1 s clock for every timer on screen (agent state, SLA, wrap-up,
 * waiting time). Components re-render only while subscribed; there is never
 * more than one interval, however many conversations are open.
 */
const listeners = new Set<() => void>();
let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const unsubscribed = () => () => {};

/**
 * The time, from the shared clock. `every` coarsens it (a 60 s threshold does not need a 1 s tick: the
 * component renders only when the rounded time changes), and `enabled: false` takes the component off the
 * clock altogether, so it never renders for it.
 */
export function useNow({ every = 1000, enabled = true }: { every?: number; enabled?: boolean } = {}): number {
  return useSyncExternalStore(
    enabled ? subscribe : unsubscribed,
    () => (enabled ? Math.floor(now / every) * every : 0),
    () => 0,
  );
}

/** Whole seconds until `deadline` (never negative), or null without a deadline. Ticks only while there is one. */
export function useSecondsLeft(deadline: number | null | undefined): number | null {
  const current = useNow({ enabled: Boolean(deadline) });
  if (!deadline) return null;
  return Math.max(0, Math.round((deadline - current) / 1000));
}

/**
 * Whether `deadline` is still ahead, without a clock: it renders once when the deadline passes
 * (the typing indicator, which has one expiry and needs no tick in between).
 */
export function useBefore(deadline: number | null | undefined): boolean {
  const watch = useCallback(
    (notify: () => void) => {
      const left = deadline ? deadline - Date.now() : 0;
      if (left <= 0) return () => {};
      const timeout = setTimeout(notify, left + 5);
      return () => clearTimeout(timeout);
    },
    [deadline],
  );
  return useSyncExternalStore(
    watch,
    () => Boolean(deadline) && Date.now() < (deadline as number),
    () => false,
  );
}
