import { Monitor, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { savePreferences, usePreferences } from "@/core/agent-settings";
import { changeLanguage, languageMeta, useLanguage, useSupportedLanguages } from "@/core/i18n";
import { localStore } from "@/core/storage/storage";
import { useThemeStore, type Density, type ThemePreference } from "@/core/theme";
import { useNavigation } from "../navigation/useNavigation";

function Row({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * Personal preferences (completes unified-agent's never-rendered SettingsComponent).
 * Stored per agent in CIM /agentSetting and applied on every login.
 */
export function PreferencesPage() {
  const { t } = useTranslation();
  const prefs = usePreferences();
  const language = useLanguage();
  const languages = useSupportedLanguages();
  const preference = useThemeStore((s) => s.preference);
  const density = useThemeStore((s) => s.density);
  const sections = useNavigation();

  const persist = (patch: Parameters<typeof savePreferences>[0]) =>
    savePreferences(patch).catch(() => toast.error(t("preferences.save-failed")));

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <p className="desk-enter mb-4 text-sm text-muted-foreground">{t("preferences.description")}</p>
      <div className="desk-panel desk-enter-delay rounded-2xl px-5">
        <Row label={t("globals.select-language")} htmlFor="pref-language">
          <Select
            value={language}
            onValueChange={async (code) => {
              localStore.setString("language", code);
              await changeLanguage(code);
              void persist({ language: code });
            }}
          >
            <SelectTrigger id="pref-language" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(languages.length ? languages : [{ code: "en", name: "English" }]).map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {languageMeta(l.code).emoji} {languageMeta(l.code).nativeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>

        <Row label={t("app-header.theme")} hint={t("preferences.theme-hint")}>
          <ToggleGroup
            type="single"
            variant="outline"
            value={preference}
            onValueChange={(value) => {
              if (!value) return;
              useThemeStore.getState().setPreference(value as ThemePreference);
              void persist({ theme: value as ThemePreference });
            }}
          >
            <ToggleGroupItem value="light" aria-label={t("globals.light")} className="gap-1.5 px-3">
              <Sun className="size-4" /> {t("globals.light")}
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label={t("globals.dark")} className="gap-1.5 px-3">
              <Moon className="size-4" /> {t("globals.dark")}
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label={t("shell.theme-system")} className="gap-1.5 px-3">
              <Monitor className="size-4" /> {t("shell.theme-system")}
            </ToggleGroupItem>
          </ToggleGroup>
        </Row>

        <Row label={t("preferences.density")} hint={t("preferences.density-hint")}>
          <ToggleGroup
            type="single"
            variant="outline"
            value={density}
            onValueChange={(value) => {
              if (!value) return;
              useThemeStore.getState().setDensity(value as Density);
              void persist({ density: value as Density });
            }}
          >
            <ToggleGroupItem value="comfortable" className="px-3">
              {t("preferences.density-comfortable")}
            </ToggleGroupItem>
            <ToggleGroupItem value="compact" className="px-3">
              {t("preferences.density-compact")}
            </ToggleGroupItem>
          </ToggleGroup>
        </Row>

        <Row label={t("globals.select-homepage")} hint={t("preferences.home-hint")} htmlFor="pref-home">
          <Select value={prefs?.home_page ?? ""} onValueChange={(home_page) => void persist({ home_page })}>
            <SelectTrigger id="pref-home" className="w-56">
              <SelectValue placeholder={t("preferences.home-default")} />
            </SelectTrigger>
            <SelectContent>
              {sections.flatMap((section) =>
                section.items.map((item) => (
                  <SelectItem key={item.id} value={item.path}>
                    {t(item.labelKey)}
                  </SelectItem>
                )),
              )}
            </SelectContent>
          </Select>
        </Row>
      </div>
    </div>
  );
}
