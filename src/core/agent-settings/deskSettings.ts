import { create } from "zustand";
import { getConfig } from "@/config";
import { ApiError, unifiedAdminApi } from "@/core/api";
import { resolveDeskSettings } from "./resolve";
import type { AgentDeskSettingsDoc, DeskSettings } from "./types";

interface DeskSettingsState {
  settings: DeskSettings | null;
  raw: AgentDeskSettingsDoc | null;
  set(raw: AgentDeskSettingsDoc): void;
}

export const useDeskSettingsStore = create<DeskSettingsState>()((set) => ({
  settings: null,
  raw: null,
  set(raw) {
    const { isCallingComplianceEnabled, DASHBOARD_REFRESH_TIME } = getConfig();
    set({ raw, settings: resolveDeskSettings(raw, { isCallingComplianceEnabled, DASHBOARD_REFRESH_TIME }) });
  },
}));

/** GET /agent-desk-settings returns an array; the desk uses the first document. */
export async function fetchDeskSettingsDoc(): Promise<AgentDeskSettingsDoc> {
  const response = await unifiedAdminApi.get<AgentDeskSettingsDoc | AgentDeskSettingsDoc[]>(
    "/agent-desk-settings",
    {
      auth: false,
      legacyTenantHeaders: true,
    },
  );
  const doc = Array.isArray(response) ? response[0] : response;
  if (!doc || typeof doc !== "object") {
    throw new ApiError("Agent Desk Settings API returned an empty or invalid response.", 0, "EMPTY");
  }
  return doc;
}

/**
 * Loaded during bootstrap like unified-agent (Finesse SSO needs finesseURLForAgent
 * before login). A failure stops startup with a retryable error, as today.
 */
export async function loadDeskSettings(): Promise<DeskSettings> {
  const doc = await fetchDeskSettingsDoc();
  useDeskSettingsStore.getState().set(doc);
  return useDeskSettingsStore.getState().settings!;
}

export function getDeskSettings(): DeskSettings {
  const settings = useDeskSettingsStore.getState().settings;
  if (!settings) throw new Error("Agent Desk settings not loaded");
  return settings;
}

export const useDeskSettings = () => useDeskSettingsStore((s) => s.settings!);
