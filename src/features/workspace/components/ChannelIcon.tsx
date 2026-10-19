import { useQuery } from "@tanstack/react-query";
import { AtSign, Globe, Mail, MessageCircle, MessageSquare, Phone, Share2, Store, Video } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { getChannelLogo, workspaceKeys } from "../api";
import type { ChannelType } from "../model/types";

const FALLBACK: Record<string, typeof Globe> = {
  web: Globe,
  whatsapp: MessageCircle,
  facebook: Share2,
  instagram: Share2,
  twitter: AtSign,
  youtube: Video,
  linkedin: Share2,
  email: Mail,
  sms: MessageSquare,
  play_store: Store,
  apple_store: Store,
  cx_voice: Phone,
  cisco_cc: Phone,
  web_rtc: Video,
};

export const CHANNEL_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  whatsapp: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/30",
  },
  facebook: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/30",
  },
  instagram: {
    bg: "bg-pink-500/10 dark:bg-pink-500/20",
    text: "text-pink-600 dark:text-pink-400",
    ring: "ring-pink-500/30",
  },
  email: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/30",
  },
  sms: {
    bg: "bg-teal-500/10 dark:bg-teal-500/20",
    text: "text-teal-600 dark:text-teal-400",
    ring: "ring-teal-500/30",
  },
  web: {
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/30",
  },
  cx_voice: {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    ring: "ring-indigo-500/30",
  },
  cisco_cc: {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    ring: "ring-indigo-500/30",
  },
  youtube: {
    bg: "bg-red-500/10 dark:bg-red-500/20",
    text: "text-red-600 dark:text-red-400",
    ring: "ring-red-500/30",
  },
  twitter: {
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/30",
  },
  linkedin: {
    bg: "bg-blue-600/10 dark:bg-blue-600/20",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-600/30",
  },
};

/** Channel logo from the file engine (cached for the session), with an icon fallback. */
export function ChannelIcon({
  channelType,
  className,
  colored = true,
}: {
  channelType?: ChannelType | null;
  className?: string;
  colored?: boolean;
}) {
  const logo = channelType?.channelLogo;
  const channelKey = (channelType?.name ?? "").toLowerCase();
  const { data } = useQuery({
    queryKey: workspaceKeys.channelLogo(logo ?? ""),
    queryFn: () => getChannelLogo(logo!),
    enabled: Boolean(logo),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  const Fallback = FALLBACK[channelKey] ?? MessageSquare;
  const color = colored ? CHANNEL_COLORS[channelKey]?.text : undefined;

  if (data)
    return (
      <img src={data} alt={channelType?.name ?? ""} className={cn("size-4 object-contain", className)} />
    );
  return (
    <Fallback
      className={cn("size-4 text-medium transition-colors", color, className)}
      aria-label={channelType?.name}
    />
  );
}

const BADGE_SIZE = {
  sm: { chip: "size-[22px]", icon: "size-[14px]" },
  md: { chip: "size-7", icon: "size-[18px]" },
  lg: { chip: "size-9", icon: "size-5" },
} as const;

/**
 * A channel as a round, tinted chip with a clearly readable icon: the one way a
 * channel is shown on its own in the conversation view, so it is easy to spot at
 * every size and consistent everywhere.
 */
export function ChannelBadge({
  channelType,
  size = "sm",
  className,
}: {
  channelType?: ChannelType | null;
  size?: keyof typeof BADGE_SIZE;
  className?: string;
}) {
  const tint = CHANNEL_COLORS[(channelType?.name ?? "").toLowerCase()];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        tint?.bg ?? "bg-surface-2",
        BADGE_SIZE[size].chip,
        className,
      )}
      title={channelType?.name}
    >
      <ChannelIcon channelType={channelType} className={BADGE_SIZE[size].icon} />
    </span>
  );
}
