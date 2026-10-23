import { UserRound } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/**
 * Customer avatars are one quiet tone: colour in the conversation list is kept for what needs attention
 * (channel, SLA, unread), so a monogram never competes with it. A customer who is not identified gets a
 * dashed outline instead of a fill.
 */
export function getAvatarColor(name?: string | null): string {
  if (!name || isUnidentified(name)) {
    return "bg-transparent text-muted-foreground ring-1 ring-dashed ring-chat-rule";
  }
  return "bg-chat-avatar text-chat-avatar-foreground";
}

/** Check if name represents an unidentified, masked, or anonymous customer. */
function isUnidentified(name?: string | null): boolean {
  if (!name) return true;
  const trimmed = name.trim().toLowerCase();
  return (
    trimmed === "?" ||
    trimmed === "—" ||
    trimmed === "unidentified" ||
    trimmed.startsWith("unidentified") ||
    trimmed.includes("unidentified-customer") ||
    trimmed.startsWith("•") ||
    trimmed.startsWith("***")
  );
}

/** Extracts clean 2-letter monogram initials (e.g., "John Doe" -> "JD", "Alice" -> "AL"). */
export function getCustomerInitials(name?: string | null): string {
  if (!name || isUnidentified(name)) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    const word = parts[0]!;
    // If single letter or non-alphabetic
    if (word.length <= 2) return word.toUpperCase();
    return word.slice(0, 2).toUpperCase();
  }
  const first = parts[0]![0] ?? "";
  const last = parts[parts.length - 1]![0] ?? "";
  return `${first}${last}`.toUpperCase();
}

/** Avatar text for a customer; masked or missing names show a person icon. */
export function CustomerInitials({ name, className }: { name: string; className?: string }) {
  const text = getCustomerInitials(name);
  if (!text || !/\p{L}|\p{N}/u.test(text)) {
    return <UserRound className={cn("size-4", className)} aria-hidden />;
  }
  return <span className={className}>{text}</span>;
}

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<AvatarSize, { container: string; text: string; icon: string }> = {
  xs: { container: "size-6", text: "text-[11px]", icon: "size-3" },
  sm: { container: "size-7.5", text: "text-[12px]", icon: "size-3.5" },
  md: { container: "size-9", text: "text-xs font-semibold", icon: "size-4" },
  lg: { container: "size-10", text: "text-sm font-semibold", icon: "size-4.5" },
  xl: { container: "size-12", text: "text-base font-bold", icon: "size-6" },
};

/** A customer's monogram in a round, single-tone avatar. */
export function CustomerAvatar({
  name,
  size = "md",
  className,
}: {
  name?: string | null;
  size?: AvatarSize;
  className?: string;
}) {
  const colorClass = getAvatarColor(name);
  const initialsText = getCustomerInitials(name);
  const sizeConfig = SIZE_CLASSES[size];

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full font-semibold tracking-tight transition-colors select-none",
        sizeConfig.container,
        sizeConfig.text,
        colorClass,
        className,
      )}
      aria-hidden="true"
    >
      {initialsText ? initialsText : <UserRound className={sizeConfig.icon} aria-hidden />}
    </span>
  );
}
