import { useEffect, useRef, useState } from "react";
import { GripVertical, Minimize2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { customerDisplayName } from "../model/display";
import { useConversation } from "../store/conversationStore";
import { usePopoutStore } from "../store/popout";
import { ConversationPane } from "./ConversationPane";

function PopoutWindow({ conversationId, offset }: { conversationId: string; offset: number }) {
  const { t } = useTranslation();
  const conversation = useConversation(conversationId);
  const title = conversation ? customerDisplayName(conversation.customer) : t("globals.pop-out");

  // Initial position calculation: cascade from top-right
  const [pos, setPos] = useState(() => {
    const defaultWidth = 440;
    const defaultX =
      typeof window !== "undefined" ? Math.max(16, window.innerWidth - defaultWidth - 24 - offset * 24) : 24;
    const defaultY = typeof window !== "undefined" ? Math.max(16, 72 + offset * 24) : 72;
    return { x: defaultX, y: defaultY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  // Keep window within viewport bounds when window resizes
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => ({
        x: Math.max(8, Math.min(window.innerWidth - 320, prev.x)),
        y: Math.max(8, Math.min(window.innerHeight - 100, prev.y)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    // Don't initiate drag if clicking action buttons inside the header
    if ((e.target as HTMLElement).closest("button")) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const nextX = Math.max(8, Math.min(window.innerWidth - 300, dragRef.current.originX + dx));
    const nextY = Math.max(8, Math.min(window.innerHeight - 80, dragRef.current.originY + dy));
    setPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  return (
    <section
      role="dialog"
      aria-label={title}
      className="fixed z-40 flex w-[min(28rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
      style={{
        height: "min(36rem, calc(100vh - 6rem))",
        left: pos.x,
        top: pos.y,
      }}
    >
      <header
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`flex h-11 shrink-0 items-center gap-2 border-b border-border/60 bg-surface-2/60 px-3 transition-colors ${
          isDragging ? "cursor-grabbing bg-surface-3" : "cursor-grab"
        } select-none`}
        title={t("workspace.drag-window", { defaultValue: "Drag to move window" })}
      >
        <GripVertical className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
        {/* The pane below already shows the customer; the window bar is only a handle. */}
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
          {t("workspace.floating-window", { defaultValue: "Floating window" })}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {/* Merge back button */}
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="size-7 rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label={t("workspace.merge-back", { defaultValue: "Merge back into main view" })}
            title={t("workspace.merge-back", { defaultValue: "Merge back into main view" })}
            onClick={() => {
              usePopoutStore.getState().mergeBack(conversationId);
              toast.success(
                t("workspace.merged-back", { defaultValue: `${title} merged back into main view` }),
              );
            }}
          >
            <Minimize2 className="size-3.5" />
          </Button>

          {/* Close button */}
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="size-7 rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label={t("globals.close")}
            title={t("globals.close")}
            onClick={() => usePopoutStore.getState().remove(conversationId)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <ConversationPane conversationId={conversationId} />
      </div>
    </section>
  );
}

/** Floating conversation windows in this tab — never a second browser tab. */
export function ConversationPopoutHost() {
  const ids = usePopoutStore((state) => state.ids);
  return ids.map((id, index) => <PopoutWindow key={id} conversationId={id} offset={index} />);
}
