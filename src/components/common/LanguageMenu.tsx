import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { changeLanguage, languageMeta, useLanguage, useSupportedLanguages } from "@/core/i18n";
import { localStore } from "@/core/storage/storage";

interface LanguageMenuProps {
  /** Persist the choice to the agent's server-side preferences (when logged in). */
  onChanged?: (code: string) => void;
  compact?: boolean;
}

/** Languages come from the tenant's locale-setting (unified-admin Languages screen). */
export function LanguageMenu({ onChanged, compact }: LanguageMenuProps) {
  const { t } = useTranslation();
  const current = useLanguage();
  const supported = useSupportedLanguages();
  const languages = supported.length ? supported : [{ code: "en", name: "English" }];
  const meta = languageMeta(current);

  const select = async (code: string) => {
    localStore.setString("language", code);
    await changeLanguage(code);
    onChanged?.(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} aria-label={t("globals.select-language")}>
          <Globe className="size-4" aria-hidden />
          {!compact && <span className="text-sm">{meta.nativeName}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>{t("globals.select-language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((lang) => {
          const m = languageMeta(lang.code);
          return (
            <DropdownMenuItem key={lang.code} onSelect={() => void select(lang.code)} dir={m.dir}>
              {lang.flag ? (
                <img src={lang.flag} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" />
              ) : (
                <span aria-hidden>{m.emoji}</span>
              )}
              <span className="flex-1">{m.nativeName !== lang.code ? m.nativeName : lang.name}</span>
              {lang.code === current && <Check className="size-4 text-primary" aria-hidden />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
