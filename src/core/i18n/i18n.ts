import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { createLogger } from "@/core/logging/logger";
import { FALLBACK_LANGUAGE, languageMeta } from "./languages";
import { useLocaleStore, type LocaleSetting } from "./localeStore";
import {
  deepMerge,
  fetchApiTranslations,
  fetchBundledTranslations,
  fetchLocaleSetting,
} from "./translations";

const log = createLogger("i18n");
const NS = "translation";

export const i18n = i18next.createInstance();

const loaded = new Set<string>();

/**
 * Loads one language: bundled JSON (shipped defaults incl. Agent Desk 2.0 keys)
 * overlaid with the tenant's file-engine translations (admin-edited values win).
 */
async function loadLanguage(code: string, force = false): Promise<boolean> {
  if (loaded.has(code) && !force) return true;
  const [bundled, api] = await Promise.all([fetchBundledTranslations(code), fetchApiTranslations([code])]);
  const remote = api[code];
  if (!bundled && !remote) {
    log.warn(`No translations for '${code}'`);
    return false;
  }
  const tree = deepMerge(bundled ?? {}, remote ?? {});
  i18n.addResourceBundle(code, NS, tree, true, true);
  loaded.add(code);
  return true;
}

function applyDocumentLanguage(code: string) {
  const meta = languageMeta(code);
  const root = document.documentElement;
  root.lang = meta.bcp47;
  root.dir = meta.dir;
}

export function supportedCodes(setting: LocaleSetting | null): string[] {
  const codes = setting?.supportedLanguages.map((l) => l.code).filter(Boolean) ?? [];
  return codes.length ? codes : [FALLBACK_LANGUAGE];
}

/**
 * Bootstraps i18n before first render (same order as unified-agent: locale-setting,
 * then translations; both public endpoints). `preferred` is the user's saved
 * language when known (restored session), otherwise the tenant default is used.
 */
export async function initI18n(options: {
  defaultLanguage: string;
  preferred?: string | null;
}): Promise<void> {
  const setting = await fetchLocaleSetting();
  useLocaleStore.getState().setSetting(setting);

  const codes = supportedCodes(setting);
  const tenantDefault = setting?.defaultLanguage?.code || options.defaultLanguage || FALLBACK_LANGUAGE;
  const initial =
    [options.preferred, tenantDefault].find((c): c is string => !!c && codes.includes(c)) ?? codes[0]!;

  await i18n.use(initReactI18next).init({
    lng: initial,
    fallbackLng: [tenantDefault, FALLBACK_LANGUAGE].filter((v, i, a) => a.indexOf(v) === i),
    supportedLngs: Array.from(new Set([...codes, FALLBACK_LANGUAGE])),
    ns: [NS],
    defaultNS: NS,
    // Keys contain hyphens and some are flat; values use ngx-translate {{var}} syntax,
    // which is i18next's default interpolation.
    keySeparator: ".",
    nsSeparator: false,
    interpolation: { escapeValue: false },
    returnNull: false,
    resources: {},
    react: { useSuspense: false },
  });

  await Promise.all([
    loadLanguage(FALLBACK_LANGUAGE),
    tenantDefault !== FALLBACK_LANGUAGE && loadLanguage(tenantDefault),
    loadLanguage(initial),
  ]);
  await i18n.changeLanguage(initial);
  useLocaleStore.getState().setLanguage(initial);
  applyDocumentLanguage(initial);
}

export async function changeLanguage(code: string): Promise<void> {
  await loadLanguage(code);
  await i18n.changeLanguage(code);
  useLocaleStore.getState().setLanguage(code);
  applyDocumentLanguage(code);
}

/** Re-fetches a language after an admin edits translations (live update). */
export async function reloadLanguage(code: string): Promise<void> {
  if (!loaded.has(code)) return;
  await loadLanguage(code, true);
  if (i18n.language === code) await i18n.changeLanguage(code);
}

/** Re-reads locale-setting after the admin Languages screen saves. */
export async function reloadLocaleSetting(): Promise<void> {
  useLocaleStore.getState().setSetting(await fetchLocaleSetting());
}

/** Translate outside React (toasts from services, socket handlers). */
export const t = (key: string, options?: Record<string, unknown>) => String(i18n.t(key, options as never));
