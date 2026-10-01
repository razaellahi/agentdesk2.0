/**
 * Language codes used by unified-admin (locale-setting) and the file engine.
 * They are kept verbatim (ger/spa/ita are non-standard) so Languages/Translations
 * admin screens and stored translations stay compatible; `bcp47` is what Intl,
 * date-fns and <html lang> get.
 */
export interface LanguageMeta {
  code: string;
  bcp47: string;
  nativeName: string;
  englishName: string;
  dir: "ltr" | "rtl";
  /** Regional-indicator emoji used when locale-setting has no flag image. */
  emoji: string;
}

export const LANGUAGES: Record<string, LanguageMeta> = {
  en: { code: "en", bcp47: "en", nativeName: "English", englishName: "English", dir: "ltr", emoji: "🇬🇧" },
  ar: { code: "ar", bcp47: "ar", nativeName: "العربية", englishName: "Arabic", dir: "rtl", emoji: "🇸🇦" },
  bg: { code: "bg", bcp47: "bg", nativeName: "Български", englishName: "Bulgarian", dir: "ltr", emoji: "🇧🇬" },
  fr: { code: "fr", bcp47: "fr", nativeName: "Français", englishName: "French", dir: "ltr", emoji: "🇫🇷" },
  ger: { code: "ger", bcp47: "de", nativeName: "Deutsch", englishName: "German", dir: "ltr", emoji: "🇩🇪" },
  ita: { code: "ita", bcp47: "it", nativeName: "Italiano", englishName: "Italian", dir: "ltr", emoji: "🇮🇹" },
  nb: {
    code: "nb",
    bcp47: "nb",
    nativeName: "Norsk bokmål",
    englishName: "Norwegian",
    dir: "ltr",
    emoji: "🇳🇴",
  },
  spa: { code: "spa", bcp47: "es", nativeName: "Español", englishName: "Spanish", dir: "ltr", emoji: "🇪🇸" },
  sw: { code: "sw", bcp47: "sw", nativeName: "Kiswahili", englishName: "Swahili", dir: "ltr", emoji: "🇰🇪" },
  ur: { code: "ur", bcp47: "ur", nativeName: "اردو", englishName: "Urdu", dir: "rtl", emoji: "🇵🇰" },
};

export const FALLBACK_LANGUAGE = "en";

export function languageMeta(code: string): LanguageMeta {
  return (
    LANGUAGES[code] ?? {
      code,
      bcp47: code,
      nativeName: code,
      englishName: code,
      dir: "ltr",
      emoji: "🌐",
    }
  );
}

export const toBcp47 = (code: string) => languageMeta(code).bcp47;
export const isRtl = (code: string) => languageMeta(code).dir === "rtl";
