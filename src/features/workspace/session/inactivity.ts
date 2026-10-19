/** 80% of the idle window, matching unified-agent's InactivityService. */
export function inactivityTick(
  elapsedMs: number,
  timeoutMs: number,
): { logout: boolean; warnSeconds: number } {
  if (timeoutMs <= 0) return { logout: false, warnSeconds: 0 };
  if (elapsedMs >= timeoutMs) return { logout: true, warnSeconds: 0 };
  const warnAt = Math.floor(timeoutMs * 0.8);
  if (elapsedMs >= warnAt) {
    return { logout: false, warnSeconds: Math.ceil((timeoutMs - elapsedMs) / 1000) };
  }
  return { logout: false, warnSeconds: 0 };
}

/** Reason code unified-agent sends on an inactivity logout. */
export const INACTIVITY_REASON = {
  name: "SESSION_TIMEOUT_INACTIVITY",
  description: "Logout due to no activity on interface",
  type: "LOGOUT",
  code: 9,
  id: "12ffc95cf12b6ccf1594d948",
} as const;
