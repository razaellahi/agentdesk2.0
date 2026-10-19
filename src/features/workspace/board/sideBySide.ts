import { toast } from "sonner";
import { t } from "@/core/i18n";
import { useBoardStore } from "../store/boardStore";
import { useConversationStore } from "../store/conversationStore";

/**
 * Puts a conversation on the board beside the ones already shown (rail toggle,
 * Ctrl/⌘-click, pane menu). A full board gives up its least recently used
 * unpinned pane, with Undo, so an agent never loses a pane silently.
 */
export function showSideBySide(id: string) {
  const before = useConversationStore.getState().activeId;
  const result = useBoardStore.getState().openBeside(id);
  if (!result.ok) {
    toast.info(t("workspace.board-all-pinned"));
    return;
  }
  useConversationStore.getState().setActive(id);
  if (result.replaced) {
    toast(t("workspace.board-replaced"), {
      // Long enough for a busy agent to notice and undo.
      duration: 10_000,
      action: {
        label: t("workspace.undo"),
        onClick: () => {
          useBoardStore.getState().restore(result.previous, before);
          useConversationStore.getState().setActive(before);
        },
      },
    });
  }
}

/** Takes a conversation off the board; the next focused pane becomes active. */
export function removeFromBoard(id: string) {
  const board = useBoardStore.getState();
  board.remove(id);
  const { panes, focus } = useBoardStore.getState();
  if (
    useConversationStore.getState().activeId === id ||
    !panes.includes(useConversationStore.getState().activeId ?? "")
  )
    useConversationStore.getState().setActive(panes[focus] ?? null);
}
