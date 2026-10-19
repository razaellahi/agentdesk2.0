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
  pinned_quick_links?: Array<string | { _id: string }>;
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

/** Reads a user's /agentSetting without touching the signed-in preference store. */
export async function fetchPreferences(
  userId: string,
  { anonymous = false }: { anonymous?: boolean } = {},
): Promise<AgentPreferences | null> {
  // Before sign-in (forced password change) there is no session to refresh or end.
  const response = await cimCustomerApi.get<AgentPreferences | AgentPreferences[]>("/agentSetting", {
    searchParams: { user_Id: userId },
    ...(anonymous && { auth: false }),
  });
  return (Array.isArray(response) ? response[0] : response) ?? null;
}

export async function loadPreferences(userId: string): Promise<AgentPreferences | null> {
  try {
    const prefs = await fetchPreferences(userId);
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
