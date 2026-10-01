import { create } from "zustand";
import { cimCustomerApi } from "@/core/api";
import { createLogger } from "@/core/logging/logger";

const log = createLogger("preferences");

/** Per-agent settings stored in CIM customer /agentSetting (theme, language, home page, pins). */
export interface AgentPreferences {
  _id?: string;
  id?: string;
  user_Id?: string;
  theme?: "light" | "dark" | "system";
  language?: string;
  home_page?: string;
  pinned_quick_links?: string[];
  /** Agent Desk 2.0 additions; older backends ignore unknown fields. */
  density?: "comfortable" | "compact";
  board?: { maxPanes?: number; autoPlace?: boolean };
  [key: string]: unknown;
}

interface PreferencesState {
  prefs: AgentPreferences | null;
  loaded: boolean;
  setPrefs(prefs: AgentPreferences | null): void;
}

export const usePreferencesStore = create<PreferencesState>()((set) => ({
  prefs: null,
  loaded: false,
  setPrefs: (prefs) => set({ prefs, loaded: true }),
}));

export async function loadPreferences(userId: string): Promise<AgentPreferences | null> {
  try {
    const response = await cimCustomerApi.get<AgentPreferences | AgentPreferences[]>("/agentSetting", {
      searchParams: { user_Id: userId },
    });
    const prefs = (Array.isArray(response) ? response[0] : response) ?? null;
    usePreferencesStore.getState().setPrefs(prefs);
    return prefs;
  } catch (error) {
    log.warn("agentSetting unavailable", error);
    usePreferencesStore.getState().setPrefs(null);
    return null;
  }
}

/** Optimistically updates and persists one or more preference fields. */
export async function savePreferences(patch: Partial<AgentPreferences>): Promise<void> {
  const current = usePreferencesStore.getState().prefs;
  const next = { ...(current ?? {}), ...patch };
  usePreferencesStore.getState().setPrefs(next);
  const id = current?._id ?? current?.id;
  if (!id) return;
  try {
    await cimCustomerApi.put(`/agentSetting/${id}`, next);
  } catch (error) {
    log.error("Saving preferences failed", error);
    usePreferencesStore.getState().setPrefs(current);
    throw error;
  }
}

export const usePreferences = () => usePreferencesStore((s) => s.prefs);
