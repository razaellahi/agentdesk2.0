import { EmptyConversationArt } from "./EmptyConversationArt";
import { ArrowLeft, Pause, Play, Timer, UserRound } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDeskSettings } from "@/core/agent-settings";
import { usePermission } from "@/core/auth";
import { formatDuration } from "@/core/i18n";
import { useSecondsLeft, useNow } from "@/shared/hooks/useNow";
import { cn } from "@/shared/lib/utils";
import { useMaskedValue } from "../hooks/useMaskedValue";
import { usePastActivities } from "../hooks/usePastActivities";
import { parseConversationInsight } from "../model/conversationInsight";
import { channelLabel } from "../model/display";
import {
  leaveConversation,
  pauseConversation,
  resumeConversation,
  skipWrapUp,
  submitWrapUp,
} from "../session/actions";
import { useConversation, useConversationStore } from "../store/conversationStore";
import { AssistDialog } from "./AssistDialog";
import { ChannelBadge } from "./ChannelIcon";
import { Composer } from "./Composer";
import { CustomerAvatar } from "./CustomerInitials";
import { ContextDock, ContextSheetBody } from "./ContextPanel";
import { useContextPanelState } from "../hooks/useContextPanelState";
import { EmbeddedApps } from "./EmbeddedApps";
import { MessageStream } from "./messages/MessageStream";
import { WrapUpPanel } from "./WrapUpPanel";
import { ConversationActions, type PaneLayout } from "./ConversationActions";
import { MessageBoundary } from "./messages/MessageBoundary";

/** The open conversation: transcript, timers, and the actions an agent takes on it. */
export function ConversationPane({
  conversationId,
  onBack,
  board,
}: {
  conversationId: string | null;
  /** Mobile list↔detail: return to the conversation list. */
  onBack?: () => void;
  /** Set when shown side by side: this pane's place on the board. */
  board?: { index: number; count: number; focused: boolean };
}) {
  const { t } = useTranslation();
  const conversation = useConversation(conversationId);
  const settings = useDeskSettings();
  const slaLeft = useSecondsLeft(conversation?.sla.deadline ?? null);
  const holdLeft = useSecondsLeft(conversation?.hold.deadline ?? null);
  const now = useNow();
  const firstName = useMaskedValue(conversation?.customer.firstName, "firstName", "manage_in_conversation");
  const lastName = useMaskedValue(conversation?.customer.lastName, "lastName", "manage_in_conversation");
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  const past = usePastActivities(conversation);
  const [layout, setLayout] = useState<PaneLayout>("narrow");
  const isUltraNarrow = layout === "ultra-narrow";
  const narrow = layout === "narrow" || isUltraNarrow;
  // The context docks only in a single wide conversation; side-by-side panes
  // use the Customer Info slide-over, so the dock never jumps between panes as focus moves.
  const docked = !narrow && !board;
  const measurePane = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setLayout(width < 460 ? "ultra-narrow" : width < 660 ? "narrow" : width < 960 ? "compact" : "roomy");
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // Only an explicit click opens a sheet; a stored wide-panel preference must
  // never cover a newly opened split pane or pop-out with a modal.
  const [infoOpen, setInfoOpen] = useState(false);
  const [contextTab, setContextTab] = useContextPanelState();
  const [assist, setAssist] = useState(false);
  const canLeave = usePermission("leaveChat");
  const activeSession =
    conversation?.activeChannelSessions.find((session) => session.isChecked) ??
    conversation?.activeChannelSessions[0];
  // The customer's identifier on the active channel is PII: mask it like the profile.
  const activeIdentifier = useMaskedValue(
    activeSession?.channelData.channelCustomerIdentifier,
    activeSession?.channel.channelType.name.toLowerCase() === "email" ? "email" : "phoneNumber",
    "manage_in_conversation",
  );

  const setInfo = (open: boolean) => {
    if (!docked) setInfoOpen(open);
    else setContextTab(open ? (contextTab ?? "profile") : null);
  };

  if (!conversation) {
    return (
      // m-auto centers without clipping: a grid with place-items-center would cut off overflow in short panes.
      <div className="flex flex-1 overflow-y-auto bg-surface px-6 py-8 text-center">
        <div className="desk-enter m-auto flex max-w-md flex-col items-center">
          <EmptyConversationArt className="h-44 w-auto sm:h-60 lg:h-72" />
          <p className="mt-6 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {t("globals.no-new-conversation")}
          </p>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("globals.no-conversation-sub-heading")}
          </p>
          {onBack && (
            <Button type="button" variant="outline" className="mt-6 rounded-full" onClick={onBack}>
              <ArrowLeft className="size-4" />
              {t("workspace.conversations")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const signal = Boolean(board && board.count > 1 && !board.focused && conversation.unread > 0);
  const displayName = name || t("globals.UNIDENTIFIED-CUSTOMER");
  const channelLine =
    conversation.typingUntil && conversation.typingUntil > now
      ? t("workspace.typing")
      : activeSession
        ? [channelLabel(activeSession.channel.channelType.name), activeIdentifier].filter(Boolean).join(" · ")
        : "";
  const wrapUpOpen = conversation.wrapUp.show;

  const insight = parseConversationInsight(conversation.activeConversationData);
  const sentiment = insight.sentiment;

  const leave = async () => {
    const ok = await confirm({
      title: t("chat-features.interactions.leave-conversation"),
      description: `${t("chat-features.interactions.Are-you-sure-you-want-to-leave-the-conversation-with")} ${displayName}?`,
      confirmLabel: t("chat-features.interactions.leave-conversation"),
      destructive: true,
    });
    if (ok) leaveConversation(conversation.conversationId);
  };

  const pauseFor = async (minutes: number) => {
    const ok = await confirm({
      title: t("chat-features.interactions.pause-conversation"),
      description: `${t("chat-features.interactions.are-you-sure-you-want-to-pause-this-conversation-for")} ${t("admin-settings.fields.hold.minutes", { count: minutes })}`,
      confirmLabel: t("chat-features.interactions.pause-conversation"),
    });
    if (ok) pauseConversation(conversation.conversationId, minutes * 60);
  };

  const resume = async () => {
    const ok = await confirm({
      title: t("chat-features.interactions.resume-conversation"),
      description: `${t("chat-features.interactions.are-you-sure-you-want-to-resume-conversation-with")} ${displayName}?`,
      confirmLabel: t("chat-features.interactions.resume-conversation"),
    });
    if (ok) resumeConversation(conversation.conversationId);
  };

  // One height for the SLA pill and the round action buttons beside it, so their centres line up.
  const timers = slaLeft !== null && (
    <div className="flex shrink-0 items-center gap-2">
      <span
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold tabular-nums transition-colors",
          conversation.sla.color === "sla-normal" && "bg-success-soft text-success-text",
          conversation.sla.color === "sla-warn" && "bg-warning text-on-warning",
          (conversation.sla.color === "sla-red" || conversation.sla.color === "sla-ended") &&
            "bg-destructive text-destructive-foreground",
        )}
        title={t("workspace.sla-left-hint")}
      >
        <Timer className="size-3.5" aria-hidden />
        <span className={narrow ? "sr-only" : undefined}>{t("workspace.sla-label")}</span>
        {formatDuration(slaLeft)}
      </span>
      <span className="h-5 w-px bg-border" aria-hidden />
    </div>
  );

  return (
    <section
      ref={measurePane}
      onPointerDown={() => useConversationStore.getState().setActive(conversation.conversationId)}
      onFocusCapture={() => useConversationStore.getState().setActive(conversation.conversationId)}
      className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-chat-panel-middle"
      aria-label={displayName}
    >
      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-20 border-b border-border/40 bg-chat-panel-middle-header backdrop-blur-sm",
          signal && "shadow-[inset_0_3px_0_var(--warn)]",
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-4">
          {/* Left section: Identity & Channel */}
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
            {board && (
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md bg-surface-2 text-[10px] font-bold text-muted-foreground tabular",
                  board.focused && "bg-primary text-primary-foreground",
                )}
                title={t("workspace.pane-number-shortcut", { index: board.index + 1 })}
              >
                {board.index + 1}
              </span>
            )}
            {onBack && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-8 shrink-0 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                aria-label={t("workspace.conversations")}
                onClick={onBack}
              >
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setInfo(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setInfo(true);
                }
              }}
              className="group -mx-1.5 -my-1 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-surface-2/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none sm:gap-2.5"
              title={t("chat-features.customer-info.info")}
            >
              <CustomerAvatar
                name={displayName}
                size={isUltraNarrow ? "sm" : "md"}
                className="shrink-0 transition-transform group-hover:scale-105"
              />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                  <span className="max-w-full truncate text-start text-[16px] font-medium tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {displayName}
                  </span>
                  {sentiment && !narrow && (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        sentiment === "positive" && "bg-success-soft text-success-text",
                        sentiment === "negative" && "bg-destructive-soft text-destructive-text",
                        sentiment === "neutral" && "bg-surface-2 text-muted-foreground",
                      )}
                    >
                      {sentiment === "positive" ? "😊" : sentiment === "negative" ? "⚠️" : "😐"} {sentiment}
                    </span>
                  )}
                  {sentiment && narrow && !isUltraNarrow && (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        sentiment === "positive" && "bg-success-soft text-success-text",
                        sentiment === "negative" && "bg-destructive-soft text-destructive-text",
                        sentiment === "neutral" && "bg-surface-2 text-muted-foreground",
                      )}
                      title={`Sentiment: ${sentiment}`}
                    >
                      {sentiment === "positive" ? "😊" : sentiment === "negative" ? "⚠️" : "😐"}
                    </span>
                  )}
                  {signal && (
                    <span
                      role="status"
                      className="shrink-0 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-on-warning tabular"
                    >
                      {t("workspace.new-messages", { count: conversation.unread })}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                  {activeSession && (
                    <ChannelBadge channelType={activeSession.channel.channelType} size="sm" />
                  )}
                  <span className="truncate">{channelLine}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right section: Timers & Actions */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {timers}

            <ConversationActions
              conversation={conversation}
              displayName={displayName}
              layout={layout}
              infoVisible={!docked}
              infoActive={docked ? Boolean(contextTab) : infoOpen}
              onToggleInfo={() => setInfo(!(docked ? Boolean(contextTab) : infoOpen))}
              board={board}
              onAssist={() => setAssist(true)}
              onPause={(minutes) => void pauseFor(minutes)}
              onResume={() => void resume()}
              onLeave={() => void leave()}
            />
          </div>
        </div>
      </header>

      {/* Floating Hold Status Banner */}
      {conversation.hold.active && (
        <div
          role="status"
          className="flex animate-in flex-wrap items-center justify-between gap-2 border-b border-warning/30 bg-warning-soft/90 px-3.5 py-2 text-xs font-medium text-warning-text shadow-xs backdrop-blur slide-in-from-top-1"
        >
          <span className="inline-flex items-center gap-2">
            <Pause className="size-3.5 animate-pulse" />
            <span>{t("workspace.on-hold")}</span>
            {holdLeft !== null && (
              <span className="font-mono font-bold tabular">({formatDuration(holdLeft)})</span>
            )}
          </span>
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="rounded-lg border-warning/40 bg-surface font-semibold text-warning-text shadow-2xs hover:bg-warning-soft"
            onClick={() => void resume()}
          >
            <Play className="me-1 size-3 fill-current" />
            {t("chat-features.interactions.resume-conversation")}
          </Button>
        </div>
      )}

      {/* Collaborating Agent Participants */}
      {settings.conversationParticipants && conversation.agentParticipants.length > 0 && (
        <div className="flex items-center gap-1.5 border-b border-border/40 bg-surface-2/60 px-3.5 py-1 text-xs text-muted-foreground">
          <UserRound className="size-3 text-primary" />
          <span className="font-medium text-foreground/80">
            {conversation.agentParticipants.map((p) => p.participant.keycloakUser.username).join(", ")}
          </span>
        </div>
      )}

      {/* Floating SLA Expiry Alert Banner */}
      {conversation.sla.popup && (
        <div
          role="alert"
          className="flex animate-in flex-wrap items-center justify-between gap-2 border-b border-destructive/30 bg-destructive-soft px-3.5 py-2 text-xs font-medium text-destructive-text shadow-xs slide-in-from-top-1"
        >
          <span>{t("chat-features.interactions.sla-dialog-expired")}</span>
          <span className="flex gap-2">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="rounded-lg bg-surface"
              onClick={() => useConversationStore.getState().closeSlaPopup(conversation.conversationId)}
            >
              {t("chat-features.interactions.sla-dialog-stay")}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="destructive"
              className="rounded-lg"
              disabled={!canLeave}
              onClick={() => leaveConversation(conversation.conversationId)}
            >
              {t("chat-features.interactions.sla-dialog-leave")}
            </Button>
          </span>
        </div>
      )}

      {/* Main Transcript & Composer Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <MessageBoundary
              // Retried whenever the conversation or its loaded history changes.
              messageId={`stream:${conversation.conversationId}:${past.messages.length}:${conversation.messages.length}`}
              fallback={
                <p
                  role="alert"
                  className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground"
                >
                  {t("workspace.history-unavailable")}
                </p>
              }
            >
              <MessageStream conversation={conversation} past={past} />
            </MessageBoundary>
          </div>
          <EmbeddedApps conversation={conversation} />
          <div className="relative z-10 bg-chat-panel-middle px-3 pt-2 pb-3">
            <Composer conversation={conversation} />
          </div>
        </div>

        {docked && <ContextDock conversation={conversation} open={contextTab} onOpenChange={setContextTab} />}
      </div>

      {!docked && (
        <Sheet open={infoOpen} onOpenChange={setInfo}>
          <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{t("chat-features.customer-info.info")}</SheetTitle>
            </SheetHeader>
            <SheetBody className="overflow-auto p-0">
              <ContextSheetBody
                conversation={conversation}
                tab={contextTab}
                onTab={(tab) => setContextTab(tab)}
              />
            </SheetBody>
          </SheetContent>
        </Sheet>
      )}

      <Sheet
        open={wrapUpOpen}
        onOpenChange={(open) => {
          if (open) return;
          if (conversation.wrapUp.deadline) return;
          useConversationStore.getState().hideWrapUp(conversation.conversationId);
        }}
      >
        <SheetContent side="bottom" showCloseButton={!conversation.wrapUp.deadline} className="gap-0 p-0">
          <SheetHeader>
            <SheetTitle>{t("chat-features.interactions.wrapup")}</SheetTitle>
          </SheetHeader>
          <SheetBody className="max-h-[55vh]">
            <WrapUpPanel
              deadline={conversation.wrapUp.deadline}
              chrome={false}
              onSave={(wrapups, note) => submitWrapUp(conversation.conversationId, wrapups, note)}
              onSkip={
                conversation.wrapUp.deadline ? () => skipWrapUp(conversation.conversationId) : undefined
              }
              onClose={
                conversation.wrapUp.deadline
                  ? undefined
                  : () => useConversationStore.getState().hideWrapUp(conversation.conversationId)
              }
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      {assist && <AssistDialog conversation={conversation} onClose={() => setAssist(false)} />}
    </section>
  );
}
