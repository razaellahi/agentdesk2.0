import { UserRound } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/** Curated Google Material 3 color palettes for customer avatars. */
const AVATAR_PALETTES = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 ring-blue-500/20",
  "bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 ring-teal-500/20",
  "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 ring-purple-500/20",
  "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 ring-amber-500/20",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 ring-emerald-500/20",
  "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 ring-rose-500/20",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 ring-indigo-500/20",
  "bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-300 ring-cyan-500/20",
] as const;

/** Deterministic hash from name/identifier to palette index. */
export function getAvatarColor(name?: string | null): string {
  if (!name || isUnidentified(name)) {
    return "bg-surface-2 text-muted-foreground ring-border/40";
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index] ?? AVATAR_PALETTES[0];
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

/**
 * Premium Google Material Design 3 customer avatar with deterministic colors,
 * clean monogram typography, and subtle inner ring.
 */
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
        "relative grid shrink-0 place-items-center rounded-full font-medium tracking-tight ring-1 transition-colors select-none ring-inset",
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
