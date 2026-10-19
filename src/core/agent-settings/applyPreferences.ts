import { changeLanguage, supportedCodes, useLocaleStore } from "@/core/i18n";
import { localStore } from "@/core/storage/storage";
import { useThemeStore, type ThemePreference } from "@/core/theme";
import type { AgentPreferences } from "./userPreferences";

/** Applies a user's saved theme, density and language (when the tenant supports it). */
export function applyPreferences(prefs: AgentPreferences) {
  if (prefs.theme && ["light", "dark", "system"].includes(prefs.theme)) {
    useThemeStore.getState().setPreference(prefs.theme as ThemePreference);
  }
  if (prefs.density) useThemeStore.getState().setDensity(prefs.density);
  const codes = supportedCodes(useLocaleStore.getState().setting);
  if (
    prefs.language &&
    codes.includes(prefs.language) &&
    prefs.language !== useLocaleStore.getState().language
  ) {
    localStore.setString("language", prefs.language);
    void changeLanguage(prefs.language);
  }
}
