import { create } from "zustand";

export interface SupportedLanguage {
  code: string;
  name: string;
  /** base64 data URL from unified-admin locale-setting, when configured. */
  flag?: string;
}

/** Tenant locale settings (unified-admin /locale-setting). */
export interface LocaleSetting {
  id?: string;
  supportedLanguages: SupportedLanguage[];
  defaultLanguage: SupportedLanguage;
  timezone?: { id?: number | string; name: string };
}

interface LocaleState {
  setting: LocaleSetting | null;
  language: string;
  /** IANA zone for date display; tenant setting, falling back to the browser zone. */
  timezone: string;
  setSetting(setting: LocaleSetting | null): void;
  setLanguage(code: string): void;
}

const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const useLocaleStore = create<LocaleState>()((set) => ({
  setting: null,
  language: "en",
  timezone: browserZone(),
  setSetting: (setting) => set({ setting, timezone: setting?.timezone?.name || browserZone() }),
  setLanguage: (language) => set({ language }),
}));

export const useLanguage = () => useLocaleStore((s) => s.language);
export const useTimezone = () => useLocaleStore((s) => s.timezone);
export const useSupportedLanguages = () => useLocaleStore((s) => s.setting?.supportedLanguages ?? []);
