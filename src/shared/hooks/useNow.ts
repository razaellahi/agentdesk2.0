import { useSyncExternalStore } from "react";

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

export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => now,
  );
}

/** Whole seconds until `deadline` (never negative), or null without a deadline. */
export function useSecondsLeft(deadline: number | null | undefined): number | null {
  const current = useNow();
  if (!deadline) return null;
  return Math.max(0, Math.round((deadline - current) / 1000));
}
