import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** Card, toolbar and table used by every list screen. */
export function DataView({
  title,
  description,
  toolbar,
  footer,
  children,
  className,
  /** Optional banner above the table (e.g. linking mode). */
  banner,
  /** When this changes (a new page, say) the table scrolls back to its top. */
  scrollKey,
  /** The table is showing the previous page while the next loads. */
  busy,
}: {
  title?: string;
  description?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  banner?: ReactNode;
  scrollKey?: unknown;
  busy?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [scrollKey]);
  // The page title lives in the top bar (route handle); `title` only names the
  // table region. The page surface is already the card, so the toolbar and table
  // sit flat on it (Google Chat style) instead of nesting more cards.
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {description && (
        <p className="max-w-2xl px-4 pt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {banner && <div className="px-4 pt-3">{banner}</div>}
      {toolbar && (
        <div className="flex min-h-12 w-full shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2">
          {toolbar}
        </div>
      )}
      <section aria-label={title} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scroller}
          aria-busy={busy || undefined}
          className={cn(
            "min-h-0 flex-1 [scrollbar-gutter:stable] overflow-auto bg-surface transition-opacity",
            busy && "opacity-60",
          )}
        >
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-surface px-4 py-2">
            {footer}
          </div>
        )}
      </section>
    </div>
  );
}

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <table className="w-full border-collapse text-sm text-foreground [&_tbody_tr]:border-b [&_tbody_tr]:border-border/60 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-surface-2/60 [&_tbody_tr[data-selected=true]]:bg-primary-soft/40">
      {children}
    </table>
  );
}

export function Th({ children, className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 border-b border-border bg-surface px-4 py-2.5 text-start text-xs font-medium tracking-wide text-muted-foreground",
        "cursor-pointer [&_button]:inline-flex [&_button]:items-center [&_button]:gap-1.5 [&_button]:font-medium [&_button:hover]:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("px-4 align-middle", "h-[var(--density-row)] py-1.5 text-sm text-foreground", className)}
      {...props}
    >
      {children}
    </td>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <tr className="hover:bg-transparent">
      <td colSpan={12} className="px-4 py-14 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
