import { useRef, type DragEvent } from "react";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Th } from "@/components/common/DataView";
import { ChannelCluster } from "@/features/workspace";
import { cn } from "@/shared/lib/utils";
import type { PhonebookColumn } from "./types";

/**
 * A phonebook column header (unified-agent's grid): the attribute's channels as icons, a grip to drag
 * the column to a new place, and an edge to drag its width.
 */
export function ColumnHeader({
  column,
  width,
  sorted,
  onSort,
  onResize,
  onResizeEnd,
  dragging,
  onDragStart,
  onDropOn,
}: {
  column: PhonebookColumn;
  width?: number;
  sorted: "asc" | "desc" | null;
  onSort: () => void;
  onResize: (width: number) => void;
  onResizeEnd: () => void;
  dragging: boolean;
  onDragStart: () => void;
  onDropOn: () => void;
}) {
  const { t } = useTranslation();
  const cell = useRef<HTMLTableCellElement>(null);

  const startResize = (event: React.PointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = cell.current?.getBoundingClientRect().width ?? width ?? 160;
    // Right-to-left tables grow the other way.
    const direction = getComputedStyle(cell.current ?? document.body).direction === "rtl" ? -1 : 1;
    const move = (e: PointerEvent) => onResize(startWidth + (e.clientX - startX) * direction);
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      onResizeEnd();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const allowDrop = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  return (
    <Th
      ref={cell}
      className={cn("group/col relative", dragging && "opacity-50")}
      style={width ? { width, minWidth: width, maxWidth: width } : undefined}
      onDragOver={allowDrop}
      onDrop={(event) => {
        event.preventDefault();
        onDropOn();
      }}
    >
      <div className="flex items-center gap-1">
        <span
          draggable
          role="presentation"
          title={t("globals.drag-the-column")}
          className="absolute start-0.5 top-1/2 -translate-y-1/2 cursor-grab text-muted-foreground/0 transition-colors group-hover/col:text-muted-foreground/60 active:cursor-grabbing"
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", column.field);
            onDragStart();
          }}
        >
          <GripVertical className="size-3.5" aria-hidden />
        </span>
        <button type="button" className="min-w-0 text-start" onClick={onSort}>
          <span className="truncate">{column.header}</span>
          {sorted && <span className="text-[11px]">{sorted === "asc" ? "↑" : "↓"}</span>}
        </button>
        <ChannelCluster channelTypes={column.channelTypes} />
      </div>
      <span
        role="presentation"
        onPointerDown={startResize}
        className="absolute inset-y-1.5 end-0 w-1.5 cursor-col-resize rounded-full transition-colors hover:bg-primary/40"
      />
    </Th>
  );
}
