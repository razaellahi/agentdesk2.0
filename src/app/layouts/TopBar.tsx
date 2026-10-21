import { PanelLeft } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { useTranslation } from "react-i18next";
import { useMatches } from "react-router";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/core/auth";
import { IconTooltip } from "@/components/common/IconTooltip";
import { CaseNotificationsMenu } from "@/features/cases";
import { VoicemailButton } from "@/features/customers";
import {
  AgentStateMenu,
  AgentAnnouncementsMenu,
  ConversationsButton,
  OutboundPanel,
  QuickLinksMenu,
  RequestCenter,
} from "@/features/workspace";
import type { RouteHandle } from "../router/router";
import { UserMenu } from "./UserMenu";

export function TopBar({
  navExpanded,
  onToggleNav,
  onOpenMobileNav,
}: {
  navExpanded: boolean;
  onToggleNav: () => void;
  onOpenMobileNav: () => void;
}) {
  const { t } = useTranslation();
  const agentSession = usePermission("agentSession");
  const handle = [...useMatches()].reverse().find((m) => (m.handle as RouteHandle | undefined)?.titleKey)
    ?.handle as RouteHandle | undefined;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 sm:px-4">
      {/* Left: Sidebar Toggle & Window Title */}
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Mobile menu trigger */}
        <IconTooltip label={t("shell.open-menu")}>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-9 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground md:hidden"
            onClick={onOpenMobileNav}
            aria-label={t("shell.open-menu")}
          >
            <PanelLeft className="size-4.5" />
          </Button>
        </IconTooltip>

        {/* Desktop sidebar toggle button */}
        <IconTooltip label={navExpanded ? t("shell.collapse-sidebar") : t("shell.expand-sidebar")}>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden size-9 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground md:inline-flex"
            onClick={onToggleNav}
            aria-expanded={navExpanded}
            aria-label={navExpanded ? t("shell.collapse-sidebar") : t("shell.expand-sidebar")}
          >
            <PanelLeft className="size-4.5" />
          </Button>
        </IconTooltip>

        <BrandLogo className="hidden h-7 max-w-36 sm:block" />

        <h1 className="max-w-[22rem] min-w-0 shrink truncate text-base font-medium tracking-tight text-foreground">
          {handle?.titleKey ? t(handle.titleKey) : ""}
        </h1>
      </div>

      {/* Center: Request Center */}
      <div className="hidden flex-1 justify-center px-2 md:flex">{agentSession && <RequestCenter />}</div>

      {/* Right: Controls & User Profile */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Agent State */}
        {agentSession && (
          <div className="flex items-center">
            <AgentStateMenu />
          </div>
        )}

        {/* Action Controls */}
        {agentSession && (
          <div className="hidden items-center gap-0.5 sm:flex">
            <ConversationsButton />
            <OutboundPanel />
            <AgentAnnouncementsMenu />
            <QuickLinksMenu />
            <VoicemailButton />
          </div>
        )}

        {/* Case Management alerts (SLA, mentions) also reach back-office users without an agent session */}
        <CaseNotificationsMenu />

        {/* User Profile Avatar Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
