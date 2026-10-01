import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMatches } from "react-router";
import { LanguageMenu } from "@/components/common/LanguageMenu";
import { ThemeMenu } from "@/components/common/ThemeMenu";
import { Button } from "@/components/ui/button";
import { savePreferences } from "@/core/agent-settings";
import { usePermission } from "@/core/auth";
import { AgentStateMenu } from "@/features/workspace";
import type { RouteHandle } from "../router/router";
import { UserMenu } from "./UserMenu";

export function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { t } = useTranslation();
  const agentSession = usePermission("agentSession");
  const handle = [...useMatches()].reverse().find((m) => (m.handle as RouteHandle | undefined)?.titleKey)
    ?.handle as RouteHandle | undefined;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-surface px-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMobileNav}
        aria-label={t("shell.open-menu")}
      >
        <Menu className="size-5" />
      </Button>
      <h1 className="min-w-0 truncate text-base font-semibold">
        {handle?.titleKey ? t(handle.titleKey) : ""}
      </h1>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        {agentSession && <AgentStateMenu />}
        <LanguageMenu compact onChanged={(language) => void savePreferences({ language }).catch(() => {})} />
        <ThemeMenu onChanged={(theme) => void savePreferences({ theme }).catch(() => {})} />
        <UserMenu />
      </div>
    </header>
  );
}
