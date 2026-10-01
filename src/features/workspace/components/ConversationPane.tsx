import { Hand, Pause, Play, Timer, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeskSettings } from "@/core/agent-settings";
import { formatDuration } from "@/core/i18n";
import { useSecondsLeft, useNow } from "@/shared/hooks/useNow";
import { initials } from "@/shared/lib/initials";
import { cn } from "@/shared/lib/utils";
import { useMaskedValue } from "../hooks/useMaskedValue";
import { slaRingClass, waitingLevel } from "../model/display";
import {
  leaveConversation,
  pauseConversation,
  resumeConversation,
  skipWrapUp,
  submitWrapUp,
} from "../session/actions";
import { emitHandRaise } from "../session/agentSession";
import { useConversation, useConversationStore } from "../store/conversationStore";
import { Composer } from "./Composer";
import { MessageStream } from "./messages/MessageStream";
import { WrapUpPanel } from "./WrapUpPanel";

/** The open conversation: transcript, timers, and the actions an agent takes on it. */
export function ConversationPane({ conversationId }: { conversationId: string | null }) {
  const { t } = useTranslation();
  const conversation = useConversation(conversationId);
  const settings = useDeskSettings();
  const slaLeft = useSecondsLeft(conversation?.sla.deadline ?? null);
  const now = useNow();
  const name = useMaskedValue(conversation?.customer.firstName, "firstName", "manage_in_conversation");

  if (!conversation) {
    return (
      <div className="grid flex-1 place-items-center rounded-xl border bg-surface p-8 text-center">
        <div>
          <p className="font-medium">{t("globals.no-new-conversation")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("globals.no-conversation-sub-heading")}</p>
        </div>
      </div>
    );
  }

  const waiting =
    conversation.waitingSince && !conversation.hold.active
      ? Math.floor((now - conversation.waitingSince) / 1000)
      : null;
  const level = waitingLevel(waiting);
  const displayName = name || t("globals.UNIDENTIFIED-CUSTOMER");

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

  return (
    <section
      className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-surface"
      aria-label={displayName}
    >
      <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-full bg-surface-3 text-xs font-bold ring-2",
            slaRingClass[conversation.sla.color],
          )}
        >
          {initials(
            conversation.customer.firstName,
            conversation.customer.lastName ?? undefined,
            displayName,
          )}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{displayName}</h2>
          <p className="text-xs text-muted-foreground">
            {conversation.typingUntil && conversation.typingUntil > now
              ? t("workspace.typing")
              : conversation.activeChannelSessions.map((s) => s.channel.channelType.name).join(", ")}
          </p>
        </div>
        {slaLeft !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular">
            <Timer className="size-3" /> {formatDuration(slaLeft)}
          </span>
        )}
        {level && level !== "ok" && waiting !== null && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold tabular",
              level === "warn" ? "bg-warning text-on-warning" : "bg-destructive text-destructive-foreground",
            )}
          >
            {formatDuration(waiting)}
          </span>
        )}
        <div className="ms-auto flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => emitHandRaise(conversation.conversationId)}
          >
            <Hand className="size-4" />
            {conversation.handRaised
              ? t("chat-features.interactions.lower-hand")
              : t("chat-features.interactions.raise-hand")}
          </Button>
          {conversation.hold.active ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void resume()}>
              <Play className="size-4" /> {t("chat-features.interactions.resume-conversation")}
            </Button>
          ) : (
            settings.holdOptions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="sm" variant="outline">
                    <Pause className="size-4" /> {t("chat-features.interactions.pause-conversation")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {settings.holdOptions.map((span) => (
                    <DropdownMenuItem key={span.value} onSelect={() => void pauseFor(span.value)}>
                      {t("admin-settings.fields.hold.minutes", { count: span.value })}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}
          {settings.wrapUp && conversation.state === "ACTIVE" && !conversation.wrapUp.show && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                useConversationStore
                  .getState()
                  .showWrapUp(conversation.conversationId, settings.wrapUpSeconds, Date.now())
              }
            >
              {t("chat-features.interactions.wrapup")}
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => void leave()}>
            {t("chat-features.interactions.leave-conversation")}
          </Button>
        </div>
      </header>

      {settings.conversationParticipants && conversation.agentParticipants.length > 0 && (
        <p className="flex items-center gap-1 border-b px-3 py-1 text-xs text-muted-foreground">
          <UserRound className="size-3" />
          {conversation.agentParticipants.map((p) => p.participant.keycloakUser.username).join(", ")}
        </p>
      )}

      {conversation.sla.popup && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 border-b bg-destructive-soft px-3 py-2 text-sm text-destructive-text"
        >
          <span>{t("chat-features.interactions.sla-dialog-expired")}</span>
          <span className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => useConversationStore.getState().closeSlaPopup(conversation.conversationId)}
            >
              {t("chat-features.interactions.sla-dialog-stay")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => leaveConversation(conversation.conversationId)}
            >
              {t("chat-features.interactions.sla-dialog-leave")}
            </Button>
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1">
        <MessageStream conversation={conversation} />
      </div>

      {conversation.wrapUp.show && (
        <WrapUpPanel
          deadline={conversation.wrapUp.deadline}
          onSave={(wrapups, note) => submitWrapUp(conversation.conversationId, wrapups, note)}
          onSkip={conversation.wrapUp.deadline ? () => skipWrapUp(conversation.conversationId) : undefined}
          onClose={
            conversation.wrapUp.deadline
              ? undefined
              : () => useConversationStore.getState().hideWrapUp(conversation.conversationId)
          }
        />
      )}
      <Composer conversation={conversation} />
    </section>
  );
}
