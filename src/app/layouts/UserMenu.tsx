import { Check, Globe, KeyRound, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { savePreferences } from "@/core/agent-settings";
import { logout, useCurrentUser } from "@/core/auth";
import { changeLanguage, languageMeta, useLanguage, useSupportedLanguages } from "@/core/i18n";
import { localStore } from "@/core/storage/storage";
import { useThemeStore, type ThemePreference } from "@/core/theme";
import { initials } from "@/shared/lib/initials";

const ChangePasswordDialog = lazy(() =>
  import("@/features/auth").then((m) => ({ default: m.ChangePasswordDialog })),
);

const THEME_OPTIONS: { value: ThemePreference; icon: typeof Sun; labelKey: string }[] = [
  { value: "light", icon: Sun, labelKey: "globals.light" },
  { value: "dark", icon: Moon, labelKey: "globals.dark" },
  { value: "system", icon: Monitor, labelKey: "shell.theme-system" },
];

export function UserMenu() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const currentLang = useLanguage();
  const supported = useSupportedLanguages();
  const languages = supported.length ? supported : [{ code: "en", name: "English" }];
  const themePreference = useThemeStore((s) => s.preference);
  const [changePassword, setChangePassword] = useState(false);
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 gap-2 rounded-full px-1.5 hover:bg-surface-2"
            aria-label={t("app-header.agent-menu")}
          >
            <Avatar className="size-7.5 rounded-full ring-1 ring-border">
              <AvatarFallback className="rounded-full bg-primary-soft text-xs font-semibold text-primary">
                {initials(user.firstName, user.lastName, user.username)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-36 truncate text-sm font-medium text-foreground lg:inline">
              {name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 rounded-2xl border border-border bg-surface p-1.5 shadow-lift"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.username}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate("/preferences")}>
            <Settings className="size-4" aria-hidden />
            {t("preferences.title")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setChangePassword(true)}>
            <KeyRound className="size-4" aria-hidden />
            {t("app-header.change-password")}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Globe className="size-4" aria-hidden />
              {t("globals.select-language")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-48">
              {languages.map((lang) => {
                const meta = languageMeta(lang.code);
                return (
                  <DropdownMenuItem
                    key={lang.code}
                    dir={meta.dir}
                    onSelect={() => {
                      localStore.setString("language", lang.code);
                      void changeLanguage(lang.code);
                      void savePreferences({ language: lang.code }).catch(() => {});
                    }}
                  >
                    {lang.flag ? (
                      <img src={lang.flag} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" />
                    ) : (
                      <span aria-hidden>{meta.emoji}</span>
                    )}
                    <span className="flex-1">
                      {meta.nativeName !== lang.code ? meta.nativeName : lang.name}
                    </span>
                    {lang.code === currentLang && <Check className="size-4 text-primary" aria-hidden />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun className="size-4" aria-hidden />
              {t("app-header.theme")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-44">
              {THEME_OPTIONS.map(({ value, icon: OptionIcon, labelKey }) => (
                <DropdownMenuItem
                  key={value}
                  onSelect={() => {
                    useThemeStore.getState().setPreference(value);
                    void savePreferences({ theme: value }).catch(() => {});
                  }}
                >
                  <OptionIcon className="size-4" aria-hidden />
                  <span className="flex-1">{t(labelKey)}</span>
                  {themePreference === value && <Check className="size-4 text-primary" aria-hidden />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
            <LogOut className="size-4" aria-hidden />
            {t("app-header.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {changePassword && (
        <Suspense fallback={null}>
          <ChangePasswordDialog
            open
            onOpenChange={setChangePassword}
            username={user.username}
            mode="voluntary"
          />
        </Suspense>
      )}
    </>
  );
}
