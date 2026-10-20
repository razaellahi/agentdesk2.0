import {
  BookUser,
  Clock,
  Columns2,
  Inbox,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SquareArrowOutUpRight,
  Timer,
  X,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermission, useScope } from "@/core/auth";
import { formatDuration } from "@/core/i18n";
import { useNow } from "@/shared/hooks/useNow";
import { cn } from "@/shared/lib/utils";
import { useMaskedValue } from "../hooks/useMaskedValue";
import { maskPii, piiAttribute } from "../model/pii";
import { useSchemaStore } from "../store/schemaStore";
import { lastMessagePreview } from "../model/display";
import {
  useActiveConversationId,
  useConversation,
  useConversationOrder,
  useConversationStore,
} from "../store/conversationStore";
import { usePopoutStore } from "../store/popout";
import { removeFromBoard, showSideBySide } from "../board/sideBySide";
import { maxPanes } from "../store/boardStore";
import { ResizeHandle } from "@/components/common/ResizeHandle";
import { useResizableWidth } from "@/shared/hooks/useResizableWidth";
import { ChannelIcon } from "./ChannelIcon";
import { CustomerAvatar } from "./CustomerInitials";

const RailItem = memo(function RailItem({
  id,
  active,
  mini,
  boardIndex,
  canSplit,
  narrowRail = false,
}: {
  id: string;
  active: boolean;
  mini: boolean;
  /** Pane number - 1 when this conversation is shown side by side, else -1. */
  boardIndex: number;
  canSplit: boolean;
  narrowRail?: boolean;
}) {
  const { t } = useTranslation();
  const c = useConversation(id);
  const now = useNow();
  const firstName = useMaskedValue(c?.customer.firstName, "firstName", "manage_in_conversation", {
    preferViewPii: true,
  });
  const lastName = useMaskedValue(c?.customer.lastName, "lastName", "manage_in_conversation", {
    preferViewPii: true,
  });
  const name = [firstName, lastName].filter(Boolean).join(" ");
  const isPoppedOut = usePopoutStore((s) => s.ids.includes(id));
  if (!c) return null;
  const slaSecondsLeft =
    c.sla.deadline !== null ? Math.max(0, Math.floor((c.sla.deadline - now) / 1000)) : null;
  const channel =
    c.activeChannelSessions[0]?.channel.channelType ?? c.firstChannelSession?.channel.channelType;
  const typing = Boolean(c.typingUntil && c.typingUntil > now);

  const label = name || t("globals.UNIDENTIFIED-CUSTOMER");
  const onBoard = boardIndex >= 0;
  const preview = lastMessagePreview(c.messages, t);

  const cardContent = (
    <div className="group/row relative">
      <button
        type="button"
        onClick={(event) => {
          if (canSplit && (event.ctrlKey || event.metaKey || event.shiftKey)) showSideBySide(id);
          else useConversationStore.getState().setActive(id);
        }}
        aria-current={active || undefined}
        aria-label={label}
        aria-describedby={mini ? undefined : `rail-preview-${id}`}
        className={cn(
          "group relative flex w-full items-center rounded-2xl text-start transition-all",
          mini ? "justify-center p-2" : narrowRail ? "gap-2.5 px-2.5 py-2" : "gap-3 px-3 py-2.5",
          canSplit && !mini && (onBoard ? "pe-9" : "group-hover/row:pe-9"),
          active
            ? "bg-chat-panel-left-active font-semibold text-chat-panel-left-active-text"
            : c.unread > 0
              ? "bg-surface/60 font-semibold text-foreground hover:bg-surface/80"
              : "font-normal text-foreground/90 hover:bg-chat-panel-left-hover",
        )}
      >
        {/* Avatar */}
        <span className="relative shrink-0">
          <CustomerAvatar name={name} size={narrowRail ? "sm" : "md"} />

          {/* Channel badge: solid backing + ring so it reads cleanly over the avatar, above it and the unread dot */}
          {channel && (
            <span
              className={cn(
                "absolute -end-2.5 -bottom-2.5 isolate z-20 grid place-items-center rounded-full bg-surface shadow-xs ring-2",
                // The ring matches the row behind it so the badge looks cut out of the avatar.
                active ? "ring-chat-panel-left-active" : "ring-chat-panel-left",
                narrowRail || mini ? "size-5" : "size-6",
              )}
              title={channel.name}
            >
              <span className="grid size-full place-items-center">
                <ChannelIcon channelType={channel} className={narrowRail || mini ? "size-3" : "size-3.5"} />
              </span>
            </span>
          )}

          {/* Mini mode unread badge */}
          {mini && c.unread > 0 && (
            <span
              className="absolute -end-1.5 -top-1.5 z-30 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular shadow-xs ring-2 ring-surface"
              aria-label={t("workspace.new-messages", { count: c.unread })}
            >
              {c.unread}
            </span>
          )}
        </span>

        {/* Card details */}
        <span className={cn("min-w-0 flex-1", mini && "sr-only")}>
          <span className="flex min-w-0 items-center justify-between gap-1.5">
            <span
              className={cn(
                "min-w-0 flex-1 truncate leading-snug tracking-tight",
                narrowRail ? "text-[13px]" : "text-[14px]",
                c.unread > 0
                  ? "font-semibold text-foreground"
                  : active
                    ? "font-semibold text-chat-panel-left-active-text"
                    : "font-medium text-foreground",
              )}
            >
              {label}
            </span>

            {/* Timers & Status Badges */}
            <span className="flex shrink-0 items-center gap-1">
              {isPoppedOut && (
                <span
                  className="inline-flex items-center gap-0.5 rounded bg-primary-soft/80 px-1.5 py-0.5 text-[9px] font-semibold text-primary"
                  title={t("workspace.popped-out-badge", { defaultValue: "Open in floating window" })}
                >
                  <SquareArrowOutUpRight className="size-2.5" aria-hidden />
                  {t("globals.pop-out", { defaultValue: "Floating" })}
                </span>
              )}
              {c.hold.active ? (
                <span className="py-0.2 inline-flex items-center gap-0.5 rounded bg-warning-soft px-1 text-[10px] font-semibold text-warning-text">
                  <Clock className="size-2.5" aria-hidden />
                  {t("workspace.paused")}
                </span>
              ) : slaSecondsLeft !== null &&
                (c.sla.color === "sla-warn" || c.sla.color === "sla-red" || c.sla.color === "sla-ended") ? (
                <span
                  className={cn(
                    "py-0.2 inline-flex items-center gap-0.5 rounded px-1 text-[10px] font-bold tabular",
                    c.sla.color === "sla-warn"
                      ? "bg-warning-soft text-warning-text"
                      : "bg-destructive-soft text-destructive-text",
                  )}
                  title={t("workspace.sla-left-hint")}
                >
                  <Timer className="size-2.5" aria-hidden />
                  {formatDuration(slaSecondsLeft)}
                </span>
              ) : null}
            </span>
          </span>

          <span
            id={`rail-preview-${id}`}
            className="mt-0.5 flex min-w-0 items-center justify-between gap-1.5 text-xs"
          >
            {typing ? (
              <span className="inline-flex min-w-0 flex-1 items-center gap-1 font-medium text-primary">
                <span>{t("workspace.typing")}</span>
                <span className="desk-typing" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              </span>
            ) : (
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-xs leading-normal",
                  preview
                    ? c.unread > 0
                      ? "font-medium text-foreground/85"
                      : active
                        ? "font-normal text-chat-panel-left-active-text/80"
                        : "font-normal text-muted-foreground"
                    : "text-muted-foreground/60 italic",
                )}
              >
                {preview || t("workspace.no-messages-yet")}
              </span>
            )}

            {/* Unread badge on row */}
            {c.unread > 0 && !mini && (
              <span
                className="grid h-4.5 min-w-4.5 shrink-0 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular shadow-xs"
                aria-label={t("workspace.new-messages", { count: c.unread })}
              >
                {c.unread}
              </span>
            )}
          </span>
        </span>
      </button>

      {mini && onBoard && (
        <span
          title={t("workspace.pane-number", { index: boardIndex + 1 })}
          className="pointer-events-none absolute start-1 bottom-1 grid size-4 place-items-center rounded-md bg-primary text-[9px] font-bold text-primary-foreground tabular shadow-xs"
          aria-hidden
        >
          {boardIndex + 1}
        </span>
      )}

      {/* Split pane button */}
      {canSplit && !mini && (
        <button
          type="button"
          onClick={() => (onBoard ? removeFromBoard(id) : showSideBySide(id))}
          aria-pressed={onBoard}
          aria-label={t(onBoard ? "workspace.remove-from-board-named" : "workspace.show-side-by-side-named", {
            name: label,
          })}
          title={
            onBoard
              ? t("workspace.pane-number-remove", { index: boardIndex + 1 })
              : t("workspace.show-side-by-side-hint")
          }
          className={cn(
            "absolute end-2 top-1/2 grid h-6 min-w-6 -translate-y-1/2 place-items-center rounded-lg px-1 text-[11px] font-bold tabular transition-all",
            "focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            onBoard
              ? "bg-primary text-primary-foreground shadow-xs hover:bg-destructive"
              : "border border-border bg-surface text-muted-foreground opacity-0 shadow-xs group-hover/row:opacity-100 hover:border-primary hover:bg-primary-soft hover:text-primary",
          )}
        >
          {onBoard ? (
            <>
              <span className="group-hover/row:hidden">{boardIndex + 1}</span>
              <X className="hidden size-3.5 group-hover/row:block" aria-hidden />
            </>
          ) : (
            <Columns2 className="size-3.5" aria-hidden />
          )}
        </button>
      )}
    </div>
  );

  if (!mini) return cardContent;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs space-y-1">
        <p className="text-xs font-semibold">{label}</p>
        {channel && <p className="text-[11px] text-muted-foreground">{channel.name}</p>}
        {preview && <p className="line-clamp-2 text-[11px] text-muted-foreground">{preview}</p>}
      </TooltipContent>
    </Tooltip>
  );
});

type FilterTab = "all" | "unread" | "sla" | "waiting";

/** Left list of the agent's conversations (unified-agent chats tabs). */
export function ConversationRail({
  mini = false,
  boardIds = null,
  onToggleMini,
}: {
  compact?: boolean;
  mini?: boolean;
  /** Folds the list to avatars (or opens it again); absent where folding makes no sense (mobile). */
  onToggleMini?: () => void;
  /** Conversations shown side by side, in pane order; null when side by side is unavailable. */
  boardIds?: string[] | null;
}) {
  const { t } = useTranslation();
  const order = useConversationOrder();
  // Side by side needs a second conversation to put next to this one.
  const canSplit = boardIds !== null && maxPanes() > 1 && order.length > 1;
  const activeId = useActiveConversationId();
  const canViewCustomers = usePermission("customerList");
  const canInitiate = usePermission("initiateChat");
  const manageHere = useScope("customer", "manage_in_conversation");
  const viewPii = useScope("customer", "view_pii");
  const full = manageHere || viewPii;
  const masked = useScope("customer", "masked_pii");
  const schema = useSchemaStore((s) => s.schema);
  const now = useNow();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [filter, setFilter] = useState("");

  // Calculate counts for tabs
  const { unreadCount, slaRiskCount, waitingCount } = useMemo(() => {
    const store = useConversationStore.getState().byId;
    let unread = 0;
    let sla = 0;
    let wait = 0;

    order.forEach((id) => {
      const c = store[id];
      if (!c) return;
      if (c.unread > 0) unread++;
      if (c.sla.color === "sla-warn" || c.sla.color === "sla-red" || c.sla.color === "sla-ended") sla++;
      if (c.waitingSince && !c.hold.active && now - c.waitingSince >= 60000) wait++;
    });

    return { unreadCount: unread, slaRiskCount: sla, waitingCount: wait };
  }, [order, now]);

  const filtered = useMemo(() => {
    const store = useConversationStore.getState().byId;
    const q = filter.trim().toLowerCase();

    return order.filter((id) => {
      const c = store[id];
      if (!c) return false;

      // Tab filtering
      if (activeTab === "unread" && c.unread === 0) return false;
      if (
        activeTab === "sla" &&
        c.sla.color !== "sla-warn" &&
        c.sla.color !== "sla-red" &&
        c.sla.color !== "sla-ended"
      )
        return false;
      if (activeTab === "waiting" && (!c.waitingSince || c.hold.active || now - c.waitingSince < 60000))
        return false;

      // Search query filtering
      if (!q) return true;
      const name = ["firstName", "lastName"]
        .map((key) =>
          maskPii(
            c.customer[key],
            piiAttribute(key, schema.find((attr) => attr.key.toLowerCase() === key.toLowerCase()) ?? null),
            { full, masked },
          ),
        )
        .join(" ")
        .toLowerCase();
      const preview = lastMessagePreview(c.messages, t).toLowerCase();
      return name.includes(q) || preview.includes(q);
    });
  }, [filter, order, activeTab, t, schema, full, masked, now]);

  const {
    width: railWidth,
    isDragging: isRailDragging,
    onPointerDown: onRailResizePointerDown,
    onKeyDown: onRailResizeKeyDown,
    onDoubleClick: onRailResetWidth,
  } = useResizableWidth({
    storageKey: "conversation-rail-width",
    defaultWidth: 290,
    minWidth: 220,
    maxWidth: 480,
    direction: "right",
  });

  const isNarrowRail = railWidth < 275;

  return (
    <div className="flex h-full shrink-0">
      <aside
        style={mini ? { width: "4rem" } : { width: `${railWidth}px` }}
        className={cn(
          "flex h-full w-full shrink-0 flex-col bg-chat-panel-left",
          mini && "border-r border-border/40",
          isRailDragging ? "transition-none" : "transition-[width] duration-200",
        )}
        aria-label={t("workspace.conversations")}
      >
        {mini ? (
          <div className="flex flex-col items-center gap-2 pt-3 pb-2">
            {onToggleMini && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t("workspace.expand-list")}
                title={t("workspace.expand-list")}
                onClick={onToggleMini}
                className="size-8 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                <PanelLeftOpen className="size-4 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
            <span
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary tabular"
              title={t("workspace.conversations")}
            >
              {order.length}
            </span>
          </div>
        ) : (
          <div className="space-y-2.5 border-b border-border/40 bg-chat-panel-left p-2.5 pb-2.5 sm:p-3">
            {/* Header row */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <h2
                  className={cn(
                    "truncate font-semibold tracking-tight text-foreground",
                    isNarrowRail ? "text-xs" : "text-sm",
                  )}
                >
                  {t("workspace.conversations")}
                </h2>
                <span className="py-0.2 shrink-0 rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary tabular">
                  {order.length}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                {canViewCustomers && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="size-8 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                    asChild
                  >
                    <Link to="/customers" aria-label={t("nav.customers")} title={t("nav.customers")}>
                      <BookUser className="size-4" />
                    </Link>
                  </Button>
                )}
                {onToggleMini && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="size-8 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                    aria-label={t("workspace.collapse-list")}
                    title={t("workspace.collapse-list")}
                    onClick={onToggleMini}
                  >
                    <PanelLeftClose className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Filter Tabs */}
            <div
              className="flex flex-wrap items-center gap-1"
              role="tablist"
              aria-label={t("workspace.filter-conversations")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "all"}
                onClick={() => setActiveTab("all")}
                className={cn(
                  "shrink-0 rounded-full font-medium transition-colors",
                  isNarrowRail ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
                  activeTab === "all"
                    ? "bg-primary-lt font-semibold text-primary shadow-2xs"
                    : "text-muted-foreground hover:bg-chat-panel-left-hover hover:text-foreground",
                )}
              >
                {t("workspace.filter-all")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "unread"}
                onClick={() => setActiveTab("unread")}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full font-medium transition-colors",
                  isNarrowRail ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
                  activeTab === "unread"
                    ? "bg-primary-lt font-semibold text-primary shadow-2xs"
                    : "text-muted-foreground hover:bg-chat-panel-left-hover hover:text-foreground",
                )}
              >
                {t("workspace.filter-unread")}
                {unreadCount > 0 && (
                  <span className="py-0.2 rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
                    {unreadCount}
                  </span>
                )}
              </button>
              {slaRiskCount > 0 && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "sla"}
                  onClick={() => setActiveTab("sla")}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full font-medium transition-colors",
                    isNarrowRail ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
                    activeTab === "sla"
                      ? "bg-warning-soft font-semibold text-warning-text"
                      : "text-warning-text hover:bg-warning-soft/70",
                  )}
                >
                  {t("workspace.filter-sla")}
                  <span className="rounded-full bg-warning px-1 text-[10px] font-bold text-on-warning">
                    {slaRiskCount}
                  </span>
                </button>
              )}
              {waitingCount > 0 && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "waiting"}
                  onClick={() => setActiveTab("waiting")}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full font-medium transition-colors",
                    isNarrowRail ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
                    activeTab === "waiting"
                      ? "bg-surface-3 font-semibold text-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-chat-panel-left-hover hover:text-foreground",
                  )}
                >
                  {t("workspace.filter-waiting")}
                  <span className="rounded-full bg-surface-3 px-1 text-[10px] font-bold">{waitingCount}</span>
                </button>
              )}
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={t("labels.search")}
                className="h-8.5 rounded-full border-border/40 bg-chat-panel-left-search ps-8 pe-7 text-xs shadow-none transition-all placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:bg-chat-panel-left-search"
                aria-label={t("labels.search")}
              />
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter("")}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={t("globals.clear")}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {canSplit && order.length > 1 && (boardIds?.length ?? 0) < 2 && (
              <p
                className="flex items-center gap-1.5 truncate px-1 text-[11px] text-muted-foreground"
                title={t("workspace.board-tip")}
              >
                <Columns2 className="size-3 shrink-0 text-primary" aria-hidden />
                <span>{t("workspace.board-tip")}</span>
              </p>
            )}
          </div>
        )}

        {/* Conversation Cards List */}
        {order.length === 0 && mini ? (
          <div
            className="grid flex-1 place-items-center text-muted-foreground"
            title={t("globals.no-new-conversation")}
          >
            <Inbox className="size-5" aria-hidden />
          </div>
        ) : order.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <Inbox className="size-5 text-muted-foreground/60" aria-hidden />
            <p className="text-sm text-muted-foreground">{t("globals.rail-empty")}</p>
            {canViewCustomers && (
              <Button type="button" size="sm" variant="outline" className="rounded-full" asChild>
                <Link to="/customers">{t(canInitiate ? "chat-features.chats.start" : "nav.customers")}</Link>
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-1 p-2">
              {filtered.map((id) => (
                <RailItem
                  key={id}
                  id={id}
                  active={id === activeId}
                  mini={mini}
                  canSplit={canSplit}
                  narrowRail={isNarrowRail}
                  boardIndex={boardIds && boardIds.length > 1 ? boardIds.indexOf(id) : -1}
                />
              ))}
              {filtered.length === 0 && (
                <div className="py-8 text-center">
                  <MessageSquare className="mx-auto mb-1 size-5 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">{t("globals.no-data-available")}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </aside>
      {!mini && (
        <ResizeHandle
          onPointerDown={onRailResizePointerDown}
          onKeyDown={onRailResizeKeyDown}
          onDoubleClick={onRailResetWidth}
          isDragging={isRailDragging}
          ariaLabel={t("workspace.conversations")}
        />
      )}
    </div>
  );
}
