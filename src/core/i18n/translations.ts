import { fileEngineApi, unifiedAdminApi } from "@/core/api";
import { createLogger } from "@/core/logging/logger";
import type { LocaleSetting } from "./localeStore";

const log = createLogger("i18n");
export const I18N_APPLICATION = "agent-desk";

export type TranslationTree = Record<string, unknown>;

export function deepMerge(base: TranslationTree, override: TranslationTree): TranslationTree {
  const out: TranslationTree = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      current &&
      typeof current === "object"
    ) {
      out[key] = deepMerge(current as TranslationTree, value as TranslationTree);
    } else if (value !== null && value !== undefined && value !== "") {
      out[key] = value;
    }
  }
  return out;
}

/**
 * The file engine has answered in several shapes over time (see unified-agent
 * I18nService.parseTranslationsResponse); accept all of them.
 */
export function parseTranslationsResponse(
  response: unknown,
  codes: string[],
): Record<string, TranslationTree> {
  const parsed: Record<string, TranslationTree> = {};
  if (!response || typeof response !== "object") return parsed;

  if (Array.isArray(response)) {
    for (const item of response as Record<string, unknown>[]) {
      const locale = (item?.locale ?? item?.code ?? item?.language) as string | undefined;
      const tree = (item?.translations ?? item?.data ?? item?.content) as TranslationTree | undefined;
      if (locale && tree && typeof tree === "object") parsed[locale] = tree;
    }
    return parsed;
  }

  const obj = response as Record<string, unknown>;
  const nested = obj.translations;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const tree = nested as Record<string, unknown>;
    const localeKeys = Object.keys(tree).filter((k) => codes.includes(k));
    if (localeKeys.length) {
      for (const k of localeKeys)
        if (tree[k] && typeof tree[k] === "object") parsed[k] = tree[k] as TranslationTree;
    } else if (typeof obj.locale === "string") {
      parsed[obj.locale] = tree;
    } else if (codes.length === 1 && codes[0]) {
      parsed[codes[0]] = tree;
    }
    return parsed;
  }

  for (const code of codes)
    if (obj[code] && typeof obj[code] === "object") parsed[code] = obj[code] as TranslationTree;
  return parsed;
}

/** Public endpoint (no auth), loaded before login. Returns null when unavailable. */
export async function fetchLocaleSetting(): Promise<LocaleSetting | null> {
  try {
    const response = await unifiedAdminApi.get<LocaleSetting | LocaleSetting[]>("/locale-setting", {
      auth: false,
    });
    const setting = Array.isArray(response) ? response[0] : response;
    if (!setting?.supportedLanguages?.length) return null;
    // Older documents stored plain codes.
    setting.supportedLanguages = setting.supportedLanguages.map((l) =>
      typeof l === "string" ? { code: l, name: l } : l,
    );
    return setting;
  } catch (error) {
    log.warn("locale-setting unavailable; using defaults", error);
    return null;
  }
}

export async function fetchApiTranslations(codes: string[]): Promise<Record<string, TranslationTree>> {
  try {
    const response = await fileEngineApi.get<unknown>("/api/i18n/translations", {
      auth: false,
      searchParams: { application: I18N_APPLICATION, locale: codes.join(",") },
    });
    return parseTranslationsResponse(response, codes);
  } catch (error) {
    log.warn(`file-engine translations unavailable for ${codes.join(",")}`, error);
    return {};
  }
}

export async function fetchBundledTranslations(code: string): Promise<TranslationTree | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}i18n/${code}.json`);
    if (!response.ok) return null;
    return (await response.json()) as TranslationTree;
  } catch {
    return null;
  }
}
