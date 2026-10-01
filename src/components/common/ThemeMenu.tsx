import { Check, Monitor, Moon, Sun } from "lucide-react";
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
import { useThemeStore, type ThemePreference } from "@/core/theme";

const OPTIONS: { value: ThemePreference; icon: typeof Sun; labelKey: string }[] = [
  { value: "light", icon: Sun, labelKey: "globals.light" },
  { value: "dark", icon: Moon, labelKey: "globals.dark" },
  { value: "system", icon: Monitor, labelKey: "shell.theme-system" },
];

export function ThemeMenu({ onChanged }: { onChanged?: (theme: ThemePreference) => void }) {
  const { t } = useTranslation();
  const preference = useThemeStore((s) => s.preference);
  const resolved = useThemeStore((s) => s.resolved);
  const Icon = resolved === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("app-header.theme")}>
          <Icon className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>{t("app-header.theme")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map(({ value, icon: OptionIcon, labelKey }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => {
              useThemeStore.getState().setPreference(value);
              onChanged?.(value);
            }}
          >
            <OptionIcon className="size-4" aria-hidden />
            <span className="flex-1">{t(labelKey)}</span>
            {preference === value && <Check className="size-4 text-primary" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
