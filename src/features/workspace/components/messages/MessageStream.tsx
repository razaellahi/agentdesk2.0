import { ArrowDown, History, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useDeskSettings } from "@/core/agent-settings";
import { getSession } from "@/core/auth";
import { lower } from "../../model/systemMessages";
import type { Conversation } from "../../model/types";
import { publishSeen } from "../../session/seen";
import { useActiveConversationId, useConversationStore } from "../../store/conversationStore";
import { useTranscriptFocus } from "../../store/transcriptFocus";
import type { PastActivities } from "../../hooks/usePastActivities";
import { MessageBoundary } from "./MessageBoundary";
import { MessageRow } from "./MessageBody";

const TURN_GAP_MS = 5 * 60_000;

/** Consecutive messages from one sender within a few minutes read as one turn. */
function sameTurn(
  previous: Conversation["messages"][number] | undefined,
  message: Conversation["messages"][number],
) {
  if (!previous) return false;
  const a = previous.header.sender,
    b = message.header.sender;
  const type = lower(b?.type);
  if (!type || type === "system" || lower(previous.body.type) === "systemnotification") return false;
  if (lower(a?.type) !== type || (a?.id ?? "") !== (b?.id ?? "")) return false;
  return Math.abs(Number(message.header.timestamp) - Number(previous.header.timestamp)) < TURN_GAP_MS;
}

/**
 * Top of the transcript: a quiet link to load the customer's earlier activities.
 * Nothing is shown once everything is loaded; the first message is the start.
 */
function PastActivitiesBar({ context }: { context?: { past?: PastActivities } }) {
  const { t } = useTranslation();
  const past = context?.past;
  // Headroom: the first message's hover actions float above it and must not touch the top edge.
  if (!past || past.status === "hidden" || past.status === "end") return <div className="h-6" />;
  const loading = past.status === "loading";
  return (
    <div className="flex justify-center px-6 pt-3 pb-2">
      <button
        type="button"
        disabled={loading}
        onClick={past.loadMore}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : (
          <History className="size-3" aria-hidden />
        )}
        {t(loading ? "chat-features.interactions.loading" : "workspace.load-previous-activities")}
      </button>
    </div>
  );
}

/** Virtualized transcript with visibility-based receipts and memory-only scroll restoration. */
export function MessageStream({
  conversation: live,
  past,
}: {
  conversation: Conversation;
  /** The customer's earlier activities, shown above this conversation's own messages. */
  past?: PastActivities;
}) {
  const { t } = useTranslation();
  const formatting = useDeskSettings().messageFormatting;
  const me = getSession().user?.id;
  const older = past?.messages;
  const conversation = useMemo(
    () => (older?.length ? { ...live, messages: [...older, ...live.messages] } : live),
    [live, older],
  );
  const messages = conversation.messages;
  // The agent's most recent message spells out its delivery state.
  const latestOwnId = messages.findLast(
    (m) => lower(m.header.sender?.type) === "agent" && m.header.sender?.id === me && !m.body.isWhisper,
  )?.id;
  const [origin, setOrigin] = useState({ head: messages[0]?.id, index: 1_000_000 });
  if (origin.head !== messages[0]?.id) {
    const prepended = origin.head ? messages.findIndex((message) => message.id === origin.head) : 0;
    setOrigin({ head: messages[0]?.id, index: prepended > 0 ? origin.index - prepended : origin.index });
  }
  const activeId = useActiveConversationId();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<VirtuosoHandle>(null);
  const scrollTimer = useRef<number | undefined>(undefined);
  const [atBottom, setAtBottom] = useState(true);
  // Mouse movement or scrolling shows the auto-hiding scrollbar; it hides again after a few idle seconds.
  const markActive = () => {
    const el = root.current;
    if (!el) return;
    el.dataset.active = "true";
    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => delete el.dataset.active, 1500);
  };
  const lastIncoming = [...messages]
    .reverse()
    .find(
      (message) =>
        ["customer", "agent"].includes(lower(message.header.sender?.type)) &&
        message.header.sender?.id !== me,
    );
  // Opening or accepting a conversation always lands on its newest message.
  useEffect(() => {
    if (messages.length === 0) return;
    list.current?.scrollToIndex({ index: messages.length - 1, align: "end" });
    // Only when the conversation changes; new messages follow via followOutput.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.conversationId]);

  // Opened from outside (a case's linked conversation) at a moment: bring the message nearest that
  // time into view, loading older history first when it is not loaded yet, and flash it.
  const target = useTranscriptFocus((state) => state.target);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!target || target.conversationId !== conversation.conversationId || messages.length === 0) return;
    const stamp = (message: (typeof messages)[number]) => Number(message.header.timestamp ?? 0);
    if (stamp(messages[0]!) > target.at && past && (past.status === "idle" || past.status === "loading")) {
      if (past.status === "idle") past.loadMore();
      return;
    }
    const found = messages.findIndex((message) => stamp(message) >= target.at);
    const index = found < 0 ? messages.length - 1 : found;
    const id = messages[index]!.id;
    useTranscriptFocus.getState().clear();
    // Let the list lay out the loaded history before scrolling to it.
    window.setTimeout(() => {
      list.current?.scrollToIndex({ index, align: "center" });
      setFlashId(id);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlashId(null), 3000);
    }, 200);
  }, [target, messages, past, conversation.conversationId]);
  useEffect(() => {
    const element = root.current;
    if (!element || !lastIncoming) return;
    const ownerDocument = element.ownerDocument,
      ownerWindow = ownerDocument.defaultView!;
    let visible = false;
    const check = () => {
      const modal = ownerDocument.activeElement?.closest('[role="dialog"], [role="alertdialog"]');
      publishSeen(conversation, lastIncoming, {
        focused:
          activeId === conversation.conversationId &&
          ownerDocument.hasFocus() &&
          (!modal || element.contains(modal)),
        visible: visible && ownerDocument.visibilityState === "visible",
        atBottom,
      });
    };
    const focus = () => {
      if (ownerWindow !== window) useConversationStore.getState().setActive(conversation.conversationId);
      check();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = Boolean(entries[0]?.isIntersecting && entries[0].intersectionRatio >= 0.5);
        check();
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(element);
    ownerDocument.addEventListener("visibilitychange", check);
    ownerWindow.addEventListener("focus", focus);
    ownerDocument.addEventListener("focusin", check);
    return () => {
      observer.disconnect();
      ownerDocument.removeEventListener("visibilitychange", check);
      ownerWindow.removeEventListener("focus", focus);
      ownerDocument.removeEventListener("focusin", check);
    };
  }, [conversation, lastIncoming, activeId, atBottom]);

  if (!messages.length)
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-muted-foreground/70">{t("workspace.no-messages-yet")}</p>
          {past && past.status !== "hidden" && past.status !== "end" && (
            <PastActivitiesBar context={{ past }} />
          )}
        </div>
      </div>
    );

  return (
    <div ref={root} className="scroll-autohide relative h-full min-h-0" onMouseMove={markActive}>
      <Virtuoso
        ref={list}
        // Messages wrap to the pane; the transcript never scrolls sideways.
        style={{ height: "100%", overflowX: "hidden" }}
        onScroll={markActive}
        data={messages}
        firstItemIndex={origin.index}
        computeItemKey={(_, message) => message.id}
        atBottomStateChange={setAtBottom}
        followOutput="auto"
        context={{ past }}
        components={{ Header: PastActivitiesBar }}
        initialTopMostItemIndex={messages.length - 1}
        itemContent={(index, message) => (
          <MessageBoundary messageId={message.id}>
            <div className={flashId === message.id ? "desk-focus-flash" : undefined}>
              <MessageRow
                message={message}
                conversation={conversation}
                formatting={formatting}
                mine={lower(message.header.sender?.type) === "agent" && message.header.sender?.id === me}
                latestOwn={message.id === latestOwnId}
                continued={sameTurn(messages[index - origin.index - 1], message)}
              />
            </div>
          </MessageBoundary>
        )}
      />
      {!atBottom && (
        <Button
          size="sm"
          className="absolute start-1/2 bottom-4 z-20 -translate-x-1/2 gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-semibold text-foreground shadow-md transition-all hover:bg-muted hover:text-primary"
          onClick={() =>
            list.current?.scrollToIndex({ index: messages.length - 1, align: "end", behavior: "smooth" })
          }
        >
          <ArrowDown className="size-3.5" />
          <span>Jump to latest</span>
          {conversation.unread > 0 && (
            <span className="py-0.2 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground tabular">
              {conversation.unread}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
