import { useState } from "react";
import { localStore } from "@/core/storage/storage";
import type { ContextTabId } from "./useCustomerContext";

const STATE_KEY = "context-panel";

/** The agent's last context tab, or null when the panel is folded to its icon strip. */
export function useContextPanelState() {
  const [state, setState] = useState<ContextTabId | null>(() => {
    const saved = localStore.getString(STATE_KEY);
    if (saved === "closed") return null;
    return (saved as ContextTabId | null) ?? "profile";
  });
  const set = (next: ContextTabId | null) => {
    localStore.setString(STATE_KEY, next ?? "closed");
    setState(next);
  };
  return [state, set] as const;
}
