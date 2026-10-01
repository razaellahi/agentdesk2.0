import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import type { NavSection } from "../navigation/navConfig";

interface SidebarProps {
  sections: NavSection[];
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ sections, collapsed, onToggle, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("nav.main")} className="flex h-full flex-col bg-sidebar">
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2 border-b px-3",
          collapsed && "justify-center px-0",
        )}
      >
        {collapsed ? (
          <BrandLogo mark className="h-7" />
        ) : (
          <>
            <BrandLogo className="h-6 max-w-32" />
            <span className="ms-auto rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-primary uppercase">
              Agent Desk
            </span>
          </>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 px-2 py-3">
          {sections.map((section) => (
            <div key={section.id} className="flex flex-col gap-0.5">
              {!collapsed && (
                <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {t(section.labelKey)}
                </div>
              )}
              {collapsed && <div className="mx-auto my-1 h-px w-6 bg-border" aria-hidden />}
              {section.items.map((item) => {
                const link = (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    end={item.path === "/customers" || item.path === "/recordings"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium text-sidebar-foreground transition-colors",
                        "hover:bg-surface-2 hover:text-foreground",
                        isActive && "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary",
                        collapsed && "justify-center px-0",
                      )
                    }
                  >
                    <item.icon className="size-4.5 shrink-0" aria-hidden />
                    {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                    {collapsed && <span className="sr-only">{t(item.labelKey)}</span>}
                  </NavLink>
                );
                return collapsed ? (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      {onToggle && (
        <div className={cn("shrink-0 border-t p-2", collapsed && "flex justify-center")}>
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={onToggle}
            className={cn(!collapsed && "w-full justify-start")}
            aria-label={collapsed ? t("shell.expand-sidebar") : t("shell.collapse-sidebar")}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && <span>{t("shell.collapse-sidebar")}</span>}
          </Button>
        </div>
      )}
    </nav>
  );
}
