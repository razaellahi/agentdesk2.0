import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation, useMatches } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUnreadVoicemailCount } from "@/features/customers";
import { cn } from "@/shared/lib/utils";
import type { NavItem, NavSection } from "../navigation/navConfig";
import type { RouteHandle } from "../router/router";

interface SidebarProps {
  sections: NavSection[];
  collapsed: boolean;
  showBrand?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}

export function Sidebar({ sections = [], collapsed, showBrand, onNavigate, onToggleCollapse }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;
  const matches = useMatches();

  const hasVoicemail = sections.some((s) => s.items?.some((i) => i.id === "voicemail"));
  const { data: unreadVoicemail = 0 } = useUnreadVoicemailCount(hasVoicemail);

  // User manual toggle overrides: sectionId -> boolean
  const [userToggled, setUserToggled] = useState<Record<string, boolean>>({});

  const activeNavId = [...matches]
    .reverse()
    .map((m) => (m.handle as RouteHandle | undefined)?.navId)
    .find(Boolean);

  const isItemActive = (item: NavItem) => {
    if (activeNavId) {
      return item.id === activeNavId;
    }
    return currentPath === item.path || (item.path !== "/" && currentPath.startsWith(`${item.path}/`));
  };

  const isSectionActive = (section: NavSection) => {
    return section.items?.some((item) => isItemActive(item));
  };

  const toggleSection = (sectionId: string, currentIsOpen: boolean) => {
    setUserToggled((prev) => ({
      ...prev,
      [sectionId]: !currentIsOpen,
    }));
  };

  return (
    <nav aria-label={t("nav.main")} className="flex h-full flex-col bg-surface text-foreground select-none">
      {showBrand && (
        <div
          className={cn(
            "flex h-13 shrink-0 items-center border-b border-border px-3",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <BrandLogo mark className="h-6" />
          ) : (
            <>
              <BrandLogo className="h-6 max-w-28" />
              <span className="ms-auto rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-primary uppercase">
                Agent Desk
              </span>
            </>
          )}
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <div className={cn("flex flex-col gap-1 py-2.5", collapsed ? "items-center px-1.5" : "px-2.5")}>
          {sections.map((section) => {
            const SectionIcon = section.icon;
            const sectionLabel = t(section.labelKey);
            const items = section.items || [];
            const isSingleItem = items.length === 1;
            const sectionActive = isSectionActive(section);
            const isOpen = userToggled[section.id] !== undefined ? userToggled[section.id] : sectionActive;
            const isVoicemailSection = section.id === "customers";
            const showVoicemailBadge = isVoicemailSection && unreadVoicemail > 0;

            // When sidebar is collapsed (compact icon-only mode): Show floating submenu window for all sections on click
            if (collapsed) {
              return (
                <DropdownMenu key={section.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "relative flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors duration-150",
                            sectionActive
                              ? "bg-primary-soft font-medium text-primary"
                              : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                          )}
                          aria-label={sectionLabel}
                        >
                          <SectionIcon
                            className={cn("size-5 shrink-0", sectionActive && "text-primary")}
                            aria-hidden
                          />
                          {showVoicemailBadge && (
                            <span
                              className="absolute end-1 top-1 size-2.5 rounded-full bg-destructive ring-2 ring-surface"
                              aria-hidden
                            />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={12} className="text-xs font-medium">
                      {sectionLabel}
                      {showVoicemailBadge && ` (${unreadVoicemail})`}
                    </TooltipContent>
                  </Tooltip>

                  <DropdownMenuContent
                    side="right"
                    sideOffset={12}
                    align="start"
                    className="w-64 rounded-2xl border border-border bg-surface p-2 shadow-lift"
                  >
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2">
                        <SectionIcon className="size-4.5 text-primary" aria-hidden />
                        <span className="text-sm font-medium tracking-tight text-foreground">
                          {sectionLabel}
                        </span>
                      </div>
                      {showVoicemailBadge && (
                        <Badge
                          variant="destructive"
                          className="h-4.5 px-1.5 text-[10px] leading-none font-bold"
                        >
                          {unreadVoicemail}
                        </Badge>
                      )}
                    </div>
                    <DropdownMenuSeparator className="my-1" />
                    <div className="flex flex-col gap-0.5">
                      {items.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemVoicemail = item.id === "voicemail";
                        const itemVoicemailBadge = isItemVoicemail && unreadVoicemail > 0;

                        const active = isItemActive(item);
                        return (
                          <DropdownMenuItem key={item.id} asChild className="p-0">
                            <NavLink
                              to={item.path}
                              end
                              onClick={onNavigate}
                              className={({ isActive }) =>
                                cn(
                                  "flex w-full cursor-pointer items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                                  isActive || active
                                    ? "bg-primary-soft font-medium text-primary"
                                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                                )
                              }
                            >
                              <ItemIcon className="size-4 shrink-0" aria-hidden />
                              <span className="flex-1 truncate tracking-tight">{t(item.labelKey)}</span>
                              {itemVoicemailBadge && (
                                <Badge
                                  variant="destructive"
                                  className="h-4.5 px-1.5 text-[10px] leading-none font-bold"
                                >
                                  {unreadVoicemail}
                                </Badge>
                              )}
                            </NavLink>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            // Expanded sidebar view: single-item
            if (isSingleItem && items[0]) {
              const singleItem = items[0];
              const singleActive = isItemActive(singleItem);
              return (
                <NavLink
                  key={section.id}
                  to={singleItem.path}
                  end
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "group flex h-10 items-center gap-3 rounded-full px-3.5 text-[14px] font-medium transition-colors",
                      isActive || singleActive
                        ? "bg-primary-soft font-medium text-primary"
                        : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => {
                    const active = isActive || singleActive;
                    return (
                      <>
                        <SectionIcon
                          className={cn(
                            "size-5 shrink-0 transition-colors",
                            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                          )}
                          aria-hidden
                        />
                        <span className="flex-1 truncate tracking-tight">{t(singleItem.labelKey)}</span>
                      </>
                    );
                  }}
                </NavLink>
              );
            }

            // Expanded sidebar view: multi-item section with collapsible accordion submenu
            return (
              <div key={section.id} className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id, Boolean(isOpen))}
                  className={cn(
                    "group flex h-10 w-full cursor-pointer items-center gap-3 rounded-full px-3.5 text-[14px] font-medium transition-colors",
                    sectionActive
                      ? "bg-surface-2/60 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                  )}
                  aria-expanded={isOpen}
                >
                  <SectionIcon
                    className={cn(
                      "size-5 shrink-0 transition-colors",
                      sectionActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                    aria-hidden
                  />
                  <span className="flex-1 truncate text-left tracking-tight">{sectionLabel}</span>

                  {showVoicemailBadge && (
                    <Badge
                      variant="destructive"
                      className="h-4.5 min-w-4.5 px-1.5 text-[10px] leading-none font-bold"
                    >
                      {unreadVoicemail}
                    </Badge>
                  )}

                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen ? "rotate-0 text-foreground" : "-rotate-90",
                    )}
                    aria-hidden
                  />
                </button>

                {isOpen && (
                  <div className="ms-4 flex flex-col gap-0.5 border-s border-border ps-3 pt-0.5 pb-1">
                    {items.map((item) => {
                      const ItemIcon = item.icon;
                      const isItemVoicemail = item.id === "voicemail";
                      const itemVoicemailBadge = isItemVoicemail && unreadVoicemail > 0;
                      const itemLabel = t(item.labelKey);
                      const itemActive = isItemActive(item);

                      return (
                        <NavLink
                          key={item.id}
                          to={item.path}
                          end
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              "group flex h-9 items-center gap-2.5 rounded-full px-3 text-[13.5px] font-medium transition-colors",
                              isActive || itemActive
                                ? "bg-primary-soft font-medium text-primary"
                                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                            )
                          }
                        >
                          {({ isActive }) => {
                            const active = isActive || itemActive;
                            return (
                              <>
                                <ItemIcon
                                  className={cn(
                                    "size-4 shrink-0",
                                    active
                                      ? "text-primary"
                                      : "text-muted-foreground group-hover:text-foreground",
                                  )}
                                  aria-hidden
                                />
                                <span className="flex-1 truncate tracking-tight">{itemLabel}</span>
                                {itemVoicemailBadge && (
                                  <Badge
                                    variant="destructive"
                                    className="h-4 min-w-4 px-1 text-[9px] leading-none font-bold"
                                  >
                                    {unreadVoicemail}
                                  </Badge>
                                )}
                              </>
                            );
                          }}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {onToggleCollapse && (
        <div className="shrink-0 border-t border-border p-2.5">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2.5 rounded-xl p-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-2/80 hover:text-foreground",
              collapsed ? "justify-center" : "px-3",
            )}
            title={collapsed ? t("shell.expand-sidebar") : t("shell.collapse-sidebar")}
            aria-label={collapsed ? t("shell.expand-sidebar") : t("shell.collapse-sidebar")}
          >
            {collapsed ? (
              <ChevronRight className="size-4.5" />
            ) : (
              <>
                <ChevronLeft className="size-4.5" />
                <span className="truncate">{t("shell.collapse-sidebar")}</span>
              </>
            )}
          </button>
        </div>
      )}
    </nav>
  );
}
