import { Inbox } from "lucide-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDuration } from "@/core/i18n";
import { useNow } from "@/shared/hooks/useNow";
import { initials } from "@/shared/lib/initials";
import { cn } from "@/shared/lib/utils";
import { useMaskedValue } from "../hooks/useMaskedValue";
import { customerDisplayName, lastMessagePreview, slaRingClass, waitingLevel } from "../model/display";
import {
  useActiveConversationId,
  useConversation,
  useConversationOrder,
  useConversationStore,
} from "../store/conversationStore";
import { ChannelIcon } from "./ChannelIcon";

const RailItem = memo(function RailItem({ id, active }: { id: string; active: boolean }) {
  const { t } = useTranslation();
  const c = useConversation(id);
  const now = useNow();
  const name = useMaskedValue(customerDisplayName(c?.customer), "firstName", "manage_in_conversation");
  if (!c) return null;
  const waitingSeconds = c.waitingSince && !c.hold.active ? Math.floor((now - c.waitingSince) / 1000) : null;
  const level = waitingLevel(waitingSeconds);
  const slaRunning = c.sla.deadline !== null && c.sla.deadline > now;
  const channel =
    c.activeChannelSessions[0]?.channel.channelType ?? c.firstChannelSession?.channel.channelType;

  return (
    <button
      type="button"
      onClick={() => useConversationStore.getState().setActive(id)}
      aria-current={active || undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 text-start transition-colors",
        "hover:bg-surface-2",
        active && "border-primary bg-primary-soft hover:bg-primary-soft",
        c.unread > 0 && !active && "shadow-[inset_3px_0_0_var(--warn)]",
      )}
    >
      <span className="relative shrink-0">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-full bg-surface-3 text-xs font-bold text-medium ring-2 ring-offset-2 ring-offset-surface",
            slaRunning || c.sla.color !== "sla-normal" ? slaRingClass[c.sla.color] : "ring-border-strong",
          )}
        >
          {initials(c.customer.firstName, c.customer.lastName ?? undefined, name || "?")}
        </span>
        {c.unread > 0 && (
          <span className="absolute -end-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full border-2 border-surface bg-warning px-1 text-[10px] font-bold text-on-warning tabular">
            {c.unread}
          </span>
        )}
        {channel && (
          <span className="absolute -end-1 -bottom-1 grid size-5 place-items-center rounded-full border-2 border-surface bg-surface">
            <ChannelIcon channelType={channel} className="size-3" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{name || t("globals.UNIDENTIFIED-CUSTOMER")}</span>
          {level && level !== "ok" && (
            <span
              className={cn(
                "ms-auto shrink-0 rounded-full px-1.5 text-[10px] font-bold tabular",
                level === "warn"
                  ? "bg-warning text-on-warning"
                  : "bg-destructive text-destructive-foreground",
              )}
              title={t("workspace.waiting-for-reply")}
            >
              {formatDuration(waitingSeconds!)}
            </span>
          )}
          {c.hold.active && (
            <span className="ms-auto shrink-0 rounded-full bg-warning-soft px-1.5 text-[10px] font-semibold text-warning-text">
              {t("workspace.paused")}
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {c.typingUntil && c.typingUntil > now ? t("workspace.typing") : lastMessagePreview(c.messages, t)}
        </span>
      </span>
    </button>
  );
});

/** Left list of the agent's conversations (unified-agent chats tabs). */
export function ConversationRail() {
  const { t } = useTranslation();
  const order = useConversationOrder();
  const activeId = useActiveConversationId();
  return (
    <aside
      className="flex h-full w-72 shrink-0 flex-col rounded-xl border bg-surface"
      aria-label={t("workspace.conversations")}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{t("workspace.conversations")}</h2>
        <span className="rounded-full bg-surface-3 px-2 text-xs font-semibold text-medium tabular">
          {order.length}
        </span>
      </div>
      {order.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <Inbox className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">{t("globals.no-new-conversation")}</p>
          <p className="text-xs text-muted-foreground">{t("globals.no-conversation-sub-heading")}</p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-1 p-2">
            {order.map((id) => (
              <RailItem key={id} id={id} active={id === activeId} />
            ))}
          </div>
        </ScrollArea>
      )}
    </aside>
  );
}
