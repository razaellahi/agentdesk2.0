import { cn } from "@/shared/lib/utils";

/**
 * Unread marker for header icon buttons. Sits on the button's top-end corner,
 * with a count or, when `count` is omitted, as a dot.
 */
export function UnreadBadge({ count, className }: { count?: number; className?: string }) {
  if (count === undefined)
    return (
      <span
        aria-hidden
        className={cn(
          "absolute end-0.5 top-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-surface",
          className,
        )}
      />
    );
  return (
    <span
      aria-hidden
      className={cn(
        "absolute end-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[11px] leading-none font-semibold text-destructive-foreground tabular-nums ring-2 ring-surface",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
