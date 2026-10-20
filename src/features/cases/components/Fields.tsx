import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * A native <select> dressed like the app's Input (same height, border, focus ring)
 * with our own chevron. `className` styles the wrapper (width, margin); the select
 * fills it. Native keeps keyboard, mobile pickers and form semantics for free.
 */
export function NativeSelect({
  className,
  selectClassName,
  children,
  ...props
}: ComponentProps<"select"> & { selectClassName?: string }) {
  return (
    <span className={cn("relative inline-block min-w-0", className)}>
      <select
        {...props}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-border bg-surface ps-3 pe-8 text-sm transition-colors duration-150 outline-none",
          "hover:border-medium focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-40",
          selectClassName,
        )}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </span>
  );
}

/** Case reference, in the app font with tabular digits (not monospace). */
export function RefId({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("text-xs font-medium text-muted-foreground tabular-nums", className)}>{value}</span>
  );
}

/** Initials avatar for owners, authors and customers. */
export function Initials({ name, className }: { name: string; className?: string }) {
  const parts = name.trim().split(/\s+/);
  const value =
    `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toUpperCase() || "?";
  return (
    <span
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary",
        className,
      )}
      aria-hidden
    >
      {value}
    </span>
  );
}

/** Quiet field caption above an input: small, muted, medium weight. */
export function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
  return (
    <Label className={cn("text-xs leading-none font-medium text-muted-foreground", className)} {...props} />
  );
}
