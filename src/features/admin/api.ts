import { fileEngineApi, unifiedAdminApi } from "@/core/api";
import { fetchDeskSettingsDoc, type AgentDeskSettingsDoc } from "@/core/agent-settings";
import { I18N_APPLICATION, type LocaleSetting } from "@/core/i18n";

const adminOpts = { legacyTenantHeaders: true } as const;

export const adminKeys = {
  deskSettings: ["admin", "desk-settings"] as const,
  locale: ["admin", "locale-setting"] as const,
  translations: ["admin", "translations"] as const,
  reference: ["admin", "translations", "reference"] as const,
  backups: ["admin", "translations", "backups"] as const,
};

// --- Agent Desk settings (unified-admin)
export const getDeskSettingsDoc = fetchDeskSettingsDoc;

export function saveDeskSettings(payload: AgentDeskSettingsDoc): Promise<AgentDeskSettingsDoc | undefined> {
  return unifiedAdminApi.put<AgentDeskSettingsDoc>("/agent-desk-settings", payload, adminOpts);
}

// --- Languages (unified-admin /locale-setting)
export async function getLocaleSetting(): Promise<LocaleSetting | null> {
  const response = await unifiedAdminApi.get<LocaleSetting[] | LocaleSetting>("/locale-setting", adminOpts);
  const doc = Array.isArray(response) ? response[0] : response;
  return doc ?? null;
}

export function createLocaleSetting(body: Omit<LocaleSetting, "id">) {
  return unifiedAdminApi.post<LocaleSetting>("/locale-setting", body, adminOpts);
}

export function updateLocaleSetting(body: LocaleSetting) {
  return unifiedAdminApi.put<LocaleSetting>("/locale-setting", body, adminOpts);
}

// --- Translations (file engine /api/i18n)
export type TranslationTree = Record<string, unknown>;

export async function getAllTranslations(): Promise<Record<string, TranslationTree>> {
  const res = await fileEngineApi.get<{ translations?: Record<string, TranslationTree> }>(
    "/api/i18n/translations",
    {
      searchParams: { application: I18N_APPLICATION },
    },
  );
  return res?.translations ?? {};
}

export function getReferenceTranslations(): Promise<unknown> {
  return fileEngineApi.get<unknown>("/api/i18n/reference-translations", {
    searchParams: { application: I18N_APPLICATION },
  });
}

export async function getBackupTranslations(): Promise<Record<string, TranslationTree>> {
  const res = await fileEngineApi.get<{ translations?: Record<string, TranslationTree> }>(
    "/api/i18n/backup-translations",
    { searchParams: { application: I18N_APPLICATION } },
  );
  return res?.translations ?? {};
}

export function restoreBackupTranslation(locale: string) {
  return fileEngineApi.post("/api/i18n/backup-translations/restore", {
    application: I18N_APPLICATION,
    locale,
  });
}

export function saveTranslations(locale: string, translations: TranslationTree) {
  return fileEngineApi.put("/api/i18n/translations", { application: I18N_APPLICATION, locale, translations });
}
