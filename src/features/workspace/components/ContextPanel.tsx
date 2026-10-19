import { ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { ResizeHandle } from "@/components/common/ResizeHandle";
import { useResizableWidth } from "@/shared/hooks/useResizableWidth";
import { cn } from "@/shared/lib/utils";
import type { Conversation } from "../model/types";
import { useContextTabs, type ContextTab, type ContextTabId } from "../hooks/useCustomerContext";
import { CustomerPanel } from "./CustomerPanel";

function TabButton({
  tab,
  selected,
  onSelect,
  orientation,
}: {
  tab: ContextTab;
  selected: boolean;
  onSelect: () => void;
  orientation: "vertical" | "horizontal";
}) {
  const Icon = tab.icon;
  const button = (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-label={tab.label}
      onClick={onSelect}
      className={cn(
        "relative grid place-items-center text-muted-foreground transition-all duration-150 hover:bg-surface-2 hover:text-foreground",
        orientation === "vertical"
          ? "size-9 rounded-full"
          : "h-8 flex-1 grid-flow-col gap-1.5 rounded-full px-3 text-xs font-medium",
        selected && "bg-primary-lt hover:bg-primary-lt font-medium text-primary hover:text-primary",
      )}
    >
      <Icon className="size-4.5 shrink-0" aria-hidden />
      {orientation === "horizontal" && <span className="truncate">{tab.label}</span>}
      {tab.attention && (
        <span
          className="absolute end-1.5 top-1.5 size-2 animate-pulse rounded-full bg-warning ring-2 ring-surface"
          aria-hidden
        />
      )}
    </button>
  );
  if (orientation === "horizontal") return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="left" className="text-xs font-medium">
        {tab.label}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Customer context docked on the right of a wide conversation (Sprinklr-style
 * third pane): an always-visible icon strip; picking a tab opens its panel,
 * picking the open tab again folds it so the transcript gets the width back.
 */
export function ContextDock({
  conversation,
  open,
  onOpenChange,
}: {
  conversation: Conversation;
  open: ContextTabId | null;
  onOpenChange: (tab: ContextTabId | null) => void;
}) {
  const { t } = useTranslation();
  const tabs = useContextTabs(conversation);
  const active = open && tabs.some((tab) => tab.id === open) ? open : open ? "profile" : null;
  const activeTab = tabs.find((tab) => tab.id === active);

  const {
    width: contextWidth,
    isDragging: isContextDragging,
    onPointerDown: onContextResizePointerDown,
    onKeyDown: onContextResizeKeyDown,
    onDoubleClick: onContextResetWidth,
  } = useResizableWidth({
    storageKey: "context-panel-width",
    defaultWidth: 340,
    minWidth: 280,
    maxWidth: 640,
    direction: "left",
  });

  return (
    <div className="flex h-full shrink-0 bg-surface">
      {active && (
        <ResizeHandle
          onPointerDown={onContextResizePointerDown}
          onKeyDown={onContextResizeKeyDown}
          onDoubleClick={onContextResetWidth}
          isDragging={isContextDragging}
          ariaLabel={t("workspace.resize-context")}
          side="left"
        />
      )}
      <div className="desk-drawer" data-open={active ? "true" : "false"}>
        <div className="desk-drawer-inner">
          <div
            className={cn(
              "flex h-full flex-col bg-surface",
              isContextDragging ? "transition-none" : "transition-[width] duration-200",
            )}
            style={{ width: `${contextWidth}px` }}
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-3.5">
              <div className="flex min-w-0 items-center gap-2">
                {activeTab && <activeTab.icon className="size-4 shrink-0 text-primary" />}
                <p className="truncate text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {activeTab?.label}
                </p>
              </div>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label={t("workspace.fold-context")}
                title={t("workspace.fold-context")}
                className="size-7.5 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                onClick={() => onOpenChange(null)}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {active && <CustomerPanel conversation={conversation} tab={active} />}
            </div>
          </div>
        </div>
      </div>
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label={t("workspace.customer-context")}
        className="flex w-12 shrink-0 flex-col items-center gap-2 border-l border-border bg-surface py-3"
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            orientation="vertical"
            selected={tab.id === active}
            onSelect={() => onOpenChange(tab.id === active ? null : tab.id)}
          />
        ))}
      </div>
    </div>
  );
}

/** The same context in a sheet, for side-by-side panes too narrow to dock it. */
export function ContextSheetBody({
  conversation,
  tab,
  onTab,
}: {
  conversation: Conversation;
  tab: ContextTabId | null;
  onTab: (tab: ContextTabId) => void;
}) {
  const { t } = useTranslation();
  const tabs = useContextTabs(conversation);
  const active = tab && tabs.some((item) => item.id === tab) ? tab : "profile";
  return (
    <div className="flex min-h-0 flex-col">
      <div
        role="tablist"
        aria-label={t("workspace.customer-context")}
        className="flex gap-1 border-b border-border/50 p-1.5"
      >
        {tabs.map((item) => (
          <TabButton
            key={item.id}
            tab={item}
            orientation="horizontal"
            selected={item.id === active}
            onSelect={() => onTab(item.id)}
          />
        ))}
      </div>
      <CustomerPanel conversation={conversation} tab={active} />
    </div>
  );
}
