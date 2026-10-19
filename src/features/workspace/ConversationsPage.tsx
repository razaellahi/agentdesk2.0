import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFeature } from "@/config/featureFlags";
import { localStore } from "@/core/storage/storage";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { cn } from "@/shared/lib/utils";
import { ConversationPane } from "./components/ConversationPane";
import { ConversationRail } from "./components/ConversationRail";
import { useBoardStore } from "./store/boardStore";
import { visiblePanes } from "./board/visiblePanes";
import { Minimize2, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { customerDisplayName } from "./model/display";
import { CustomerAvatar } from "./components/CustomerInitials";
import { useMaskedValue } from "./hooks/useMaskedValue";
import { mergeConversationBack, usePopoutStore } from "./store/popout";
import {
  useActiveConversationId,
  useConversation,
  useConversationOrder,
  useConversationStore,
} from "./store/conversationStore";

/** A pane folded into the strip: avatar, unread count, click to bring it into view. */
function FoldedPane({ conversationId, onOpen }: { conversationId: string; onOpen: () => void }) {
  const { t } = useTranslation();
  const conversation = useConversation(conversationId);
  const first = useMaskedValue(conversation?.customer.firstName, "firstName", "manage_in_conversation");
  const last = useMaskedValue(conversation?.customer.lastName, "lastName", "manage_in_conversation");
  const name = [first, last].filter(Boolean).join(" ") || t("globals.UNIDENTIFIED-CUSTOMER");
  const unread = conversation?.unread ?? 0;
  return (
    <button
      type="button"
      className="relative grid size-10 place-items-center rounded-full transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      title={t("workspace.show-folded-pane", { name })}
      aria-label={t("workspace.show-folded-pane", { name })}
      onClick={onOpen}
    >
      <CustomerAvatar name={name} size="md" />
      {unread > 0 && (
        <span className="absolute -end-1 -top-1 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

/** Opens a conversation in the board (or the single view) and makes it active. */
function openConversation(id: string) {
  useBoardStore.getState().open(id);
  useConversationStore.getState().setActive(id);
}

/**
 * Board shortcuts from the multi-chat design: Alt+1…3 focuses a pane, Alt+N jumps
 * to the next conversation with unread customer messages. `code` is used so the
 * macOS Option key (which types characters) still works.
 */
function useBoardShortcuts(count: number) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const digit = /^Digit([1-3])$/.exec(e.code);
      if (digit) {
        const index = Number(digit[1]) - 1;
        if (index >= count) return;
        e.preventDefault();
        const id = useBoardStore.getState().panes[index];
        useBoardStore.getState().focusPane(index);
        if (id) useConversationStore.getState().setActive(id);
        return;
      }
      if (e.code === "KeyN") {
        const { order, byId, activeId } = useConversationStore.getState();
        const start = Math.max(0, order.indexOf(activeId ?? ""));
        const next = [...order.slice(start + 1), ...order.slice(0, start + 1)].find((id) => byId[id]?.unread);
        if (!next) return;
        e.preventDefault();
        openConversation(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);
}

function PoppedOutPlaceholder({
  conversationId,
  onMergeBack,
}: {
  conversationId: string;
  onMergeBack: () => void;
}) {
  const { t } = useTranslation();
  const conversation = useConversation(conversationId);
  const name = customerDisplayName(conversation?.customer);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-surface-2/20 p-8 text-center">
      <div className="max-w-md space-y-4">
        <div className="relative mx-auto grid size-16 place-items-center rounded-2xl border border-primary/20 bg-primary-soft/60 text-primary shadow-xs">
          <SquareArrowOutUpRight className="size-8" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            {name
              ? `${name} is open in a floating window`
              : t("workspace.popped-out-title", { defaultValue: "Conversation open in floating window" })}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("workspace.popped-out-desc", {
              defaultValue:
                "This conversation is active in a floating window. You can drag it anywhere on screen or merge it back into the main workspace.",
            })}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-2 rounded-full px-4 text-xs font-semibold shadow-xs"
            onClick={onMergeBack}
          >
            <Minimize2 className="size-3.5" />
            {t("workspace.merge-back", { defaultValue: "Merge back into main view" })}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Agent workspace. One conversation, or up to three panes when the board flag is on. */
export default function ConversationsPage() {
  const { t } = useTranslation();
  const board = useFeature("multiPaneBoard");
  const activeId = useActiveConversationId();
  const popoutIds = usePopoutStore((s) => s.ids);
  const order = useConversationOrder();
  const focus = useBoardStore((s) => s.focus);
  const panes = useBoardStore((s) => s.panes);
  const isMobile = useMediaQuery("(max-width: 1023px)");
  // Three panes below 1536 px only fit if the list shrinks to avatars.
  const tight = useMediaQuery("(max-width: 1535px)");
  // The list folds to avatars when the agent says so; with three panes on a
  // smaller screen it folds by itself unless the agent opened it.
  const [railPref, setRailPrefState] = useState(
    () => (localStore.getString("rail") as "auto" | "collapsed" | "expanded" | null) ?? "auto",
  );
  const setRailPref = (next: "collapsed" | "expanded") => {
    localStore.setString("rail", next);
    setRailPrefState(next);
  };
  const showList = !isMobile || !activeId;
  const showPane = !isMobile || Boolean(activeId);

  useEffect(() => {
    if (activeId && board && !useBoardStore.getState().open(activeId)) {
      toast.info(t("workspace.board-all-pinned"));
      const current = useBoardStore.getState();
      useConversationStore.getState().setActive(current.panes[current.focus] ?? null);
    }
  }, [activeId, board, t]);

  useEffect(() => {
    if (!board) useBoardStore.getState().reset();
  }, [board]);
  useEffect(() => {
    useBoardStore.getState().reconcile(useConversationStore.getState().order);
  }, [order]);

  // The board is exactly the conversations the agent chose to see side by side.
  const ids: (string | null)[] = isMobile || !board || panes.length < 2 ? [activeId] : panes;
  const count = ids.length;
  const railMini = railPref === "collapsed" || (railPref === "auto" && count === 3 && tight);
  const [boardWidth, setBoardWidth] = useState(0);
  const measureBoard = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver((entries) => setBoardWidth(entries[0]?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const window_ = visiblePanes(count, Math.min(focus, count - 1), boardWidth);
  const folded = ids
    .map((id, index) => ({ id, index }))
    .filter(({ index }) => index < window_.start || index >= window_.end);
  useBoardShortcuts(count);

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {showList && (
          <div className={cn(isMobile && !showPane ? "flex w-full" : "hidden lg:flex")}>
            <ConversationRail
              compact={count > 1}
              mini={!isMobile && railMini}
              onToggleMini={isMobile ? undefined : () => setRailPref(railMini ? "expanded" : "collapsed")}
              boardIds={board && !isMobile ? panes : null}
            />
          </div>
        )}
        {showPane && (
          <div className="flex min-w-0 flex-1 flex-col bg-surface">
            <div ref={measureBoard} className="flex min-h-0 flex-1 gap-0 overflow-hidden">
              {ids.map((id, index) =>
                index < window_.start || index >= window_.end ? null : (
                  <div
                    key={id ?? `empty-${index}`}
                    className={cn(
                      "relative flex min-w-0 flex-1 flex-col transition-[flex-grow,background] duration-200 ease-out",
                      count > 1 && "min-w-[320px]",
                      // Focus is width: the pane being worked in gets ~1.75x the space.
                      count > 1 && focus === index && "grow-[1.75]",
                      count > 1 && "border-r border-border last:border-r-0",
                      count > 1 && focus === index && "bg-primary-soft/10",
                    )}
                    tabIndex={count > 1 ? -1 : undefined}
                    onFocus={() => {
                      if (count <= 1) return;
                      useBoardStore.getState().focusPane(index);
                      if (id && id !== activeId) useConversationStore.getState().setActive(id);
                    }}
                  >
                    {id && popoutIds.includes(id) ? (
                      <PoppedOutPlaceholder
                        conversationId={id}
                        onMergeBack={() => mergeConversationBack(id)}
                      />
                    ) : (
                      <ConversationPane
                        key={id ?? "empty"}
                        conversationId={id}
                        onBack={isMobile ? () => useConversationStore.getState().setActive(null) : undefined}
                        board={count > 1 ? { index, count, focused: focus === index } : undefined}
                      />
                    )}
                  </div>
                ),
              )}
              {folded.length > 0 && (
                <nav
                  aria-label={t("workspace.folded-panes")}
                  className="flex w-[52px] shrink-0 flex-col items-center gap-2 border-s border-border bg-surface-2/60 py-3"
                >
                  {folded.map(({ id, index }) =>
                    id ? (
                      <FoldedPane
                        key={id}
                        conversationId={id}
                        onOpen={() => {
                          useBoardStore.getState().focusPane(index);
                          useConversationStore.getState().setActive(id);
                        }}
                      />
                    ) : null,
                  )}
                </nav>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
