import type { ReactNode } from "react";
import { IconTooltip } from "@/components/common/IconTooltip";
import { cn } from "@/shared/lib/utils";

/**
 * A small pill of icon buttons that appears over the corner of its row on hover or focus (always on touch),
 * so a list of replies reads as text and offers its actions only to whoever reaches for them. The row it sits
 * in must be `group/hover` and `relative`.
 */
export function HoverActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "absolute end-2 top-2 flex items-center gap-0.5 rounded-full bg-surface p-0.5 opacity-0 shadow-sm ring-1 ring-black/5 transition-opacity duration-150",
        "group-focus-within/hover:opacity-100 group-hover/hover:opacity-100 [@media(hover:none)]:opacity-100",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** One icon button of a `HoverActions` pill, named by a tooltip. */
export function HoverAction({
  label,
  onClick,
  disabled,
  tone = "neutral",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary";
  children: ReactNode;
}) {
  return (
    <IconTooltip label={label}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "grid size-7 cursor-pointer place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          tone === "primary"
            ? "text-primary hover:bg-primary-soft"
            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
        )}
      >
        {children}
      </button>
    </IconTooltip>
  );
}
