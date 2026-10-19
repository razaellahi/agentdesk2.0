import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePermission } from "@/core/auth";
import { localStore } from "@/core/storage/storage";
import { VoiceHost } from "@/features/voice";
import {
  AgentSessionProvider,
  ConnectionStatusHost,
  InactivityBanner,
  LinkConversationHost,
  ConversationPopoutHost,
  RequestCenter,
} from "@/features/workspace";
import { ResizeHandle } from "@/components/common/ResizeHandle";
import { useResizableWidth } from "@/shared/hooks/useResizableWidth";
import { cn } from "@/shared/lib/utils";
import { useNavigation } from "../navigation/useNavigation";
import { useBootContext } from "../providers/BootContext";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  const { t } = useTranslation();
  const { fcmKey } = useBootContext();
  const agentSession = usePermission("agentSession");
  const sections = useNavigation();
  const [collapsed, setCollapsed] = useState(() => localStore.getString("sidebar-collapsed") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);

  const {
    width: sidebarWidth,
    isDragging: isSidebarDragging,
    onPointerDown: onSidebarResizePointerDown,
    onKeyDown: onSidebarResizeKeyDown,
    onDoubleClick: onSidebarResetWidth,
  } = useResizableWidth({
    storageKey: "sidebar-width",
    defaultWidth: 256,
    minWidth: 180,
    maxWidth: 420,
    direction: "right",
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStore.setString("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:start-2 focus:top-2"
      >
        {t("shell.skip-to-content")}
      </a>
      {agentSession && <AgentSessionProvider fcmKey={fcmKey} />}
      {agentSession && <InactivityBanner />}
      {agentSession && <VoiceHost />}
      {agentSession && <LinkConversationHost />}
      {agentSession && <ConversationPopoutHost />}
      <TopBar navExpanded={!collapsed} onToggleNav={toggle} onOpenMobileNav={() => setMobileOpen(true)} />
      {agentSession && <ConnectionStatusHost />}

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-r border-border bg-surface p-0">
          <SheetTitle className="sr-only">{t("nav.main")}</SheetTitle>
          <Sidebar sections={sections} collapsed={false} showBrand onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 flex-1">
        <aside
          style={collapsed ? { width: "4rem" } : { width: `${sidebarWidth}px` }}
          className={cn(
            "hidden shrink-0 overflow-hidden md:block",
            collapsed && "border-r border-border",
            isSidebarDragging ? "transition-none" : "transition-[width] duration-200",
          )}
        >
          <Sidebar sections={sections} collapsed={collapsed} onToggleCollapse={toggle} />
        </aside>

        {!collapsed && (
          <ResizeHandle
            onPointerDown={onSidebarResizePointerDown}
            onKeyDown={onSidebarResizeKeyDown}
            onDoubleClick={onSidebarResetWidth}
            isDragging={isSidebarDragging}
            ariaLabel={t("shell.collapse-sidebar")}
            className="hidden md:flex"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {agentSession && (
            <div className="lg:hidden">
              <RequestCenter layout="strip" />
            </div>
          )}
          <main id="main" className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface" tabIndex={-1}>
            <div className="min-h-0 flex-1 overflow-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
