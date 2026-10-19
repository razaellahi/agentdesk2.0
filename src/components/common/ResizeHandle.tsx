/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { cn } from "@/shared/lib/utils";

interface ResizeHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  onDoubleClick?: () => void;
  isDragging?: boolean;
  ariaLabel?: string;
  className?: string;
  side?: "left" | "right";
}

export function ResizeHandle({
  onPointerDown,
  onKeyDown,
  onDoubleClick,
  isDragging = false,
  ariaLabel = "Resize panel",
  className,
}: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onDoubleClick}
      title="Drag to resize, double-click to reset"
      className={cn(
        // z-20: above the neighbouring pane's own layers (composer, sticky headers), so its whole grab area works.
        "group relative z-20 flex w-px shrink-0 cursor-col-resize items-center justify-center bg-border transition-colors select-none",
        "hover:bg-primary/80 focus-visible:bg-primary focus-visible:outline-hidden",
        isDragging && "z-20 bg-primary",
        className,
      )}
    >
      {/* Invisible wider hit area for easy grabbing (6px on each side of the 1px line) */}
      <div className="absolute inset-y-0 -start-1.5 -end-1.5 z-10 cursor-col-resize" />

      {/* Subtle center grab indicator on hover/drag */}
      <div
        className={cn(
          "absolute h-7 w-1 rounded-full bg-primary opacity-0 transition-all duration-150 group-hover:scale-y-110 group-hover:opacity-100",
          isDragging && "scale-y-125 opacity-100 ring-2 ring-primary/20",
        )}
        aria-hidden
      />
    </div>
  );
}
