import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePermission } from "@/core/auth";
import { localStore } from "@/core/storage/storage";
import { AgentSessionProvider, RequestCenter } from "@/features/workspace";
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

  const toggle = () =>
    setCollapsed((value) => {
      localStore.setString("sidebar-collapsed", value ? "0" : "1");
      return !value;
    });

  return (
    <div className="flex h-full bg-canvas">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:start-2 focus:top-2"
      >
        {t("shell.skip-to-content")}
      </a>
      <aside
        className={cn(
          "hidden shrink-0 border-e bg-sidebar transition-[width] duration-200 md:block",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <Sidebar sections={sections} collapsed={collapsed} onToggle={toggle} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">{t("nav.main")}</SheetTitle>
          <Sidebar sections={sections} collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {agentSession && <AgentSessionProvider fcmKey={fcmKey} />}
        {agentSession && <RequestCenter />}
        <TopBar onOpenMobileNav={() => setMobileOpen(true)} />
        <main id="main" className="min-h-0 flex-1 overflow-auto" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
