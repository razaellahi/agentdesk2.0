import { createElement } from "react";
import { BrandIcon } from "@/components/common/BrandIcons";
import { cn } from "@/shared/lib/utils";
import { channelLook, channelTypeNames, distinctChannels } from "../model/channelIcons";
import type { ChannelType } from "../model/types";

/** A channel's glyph with no tile: its logo mark, or its line icon in the channel colour. */
export function ChannelGlyph({ name, className }: { name: string; className?: string }) {
  const look = channelLook(name);
  if (look.kind === "brand") return <BrandIcon channel={look.brand} className={className} />;
  return createElement(look.Icon, {
    className: cn(look.tone, className),
    strokeWidth: 1.9,
    "aria-hidden": true,
  });
}

/**
 * A channel on one white round tile with a hairline ring, holding its glyph. The same shape, weight
 * and spacing for every channel wherever it is listed.
 */
export function ChannelMark({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-full place-items-center rounded-full bg-surface shadow-2xs ring-1 ring-border/70",
        className,
      )}
    >
      <ChannelGlyph name={name} className="size-[58%]" />
    </span>
  );
}

/** The channel's mark at the size of its own box. */
export function ChannelIcon({
  channelType,
  className,
}: {
  channelType?: ChannelType | null;
  className?: string;
}) {
  return (
    <span className={cn("grid size-4 shrink-0", className)} aria-label={channelType?.name}>
      <ChannelMark name={channelType?.name ?? ""} />
    </span>
  );
}

const BADGE_SIZE = {
  sm: "size-[22px]",
  md: "size-7",
  lg: "size-9",
} as const;

/** A channel as its mark in a fixed round box: the same size and colour everywhere it appears. */
export function ChannelBadge({
  channelType,
  size = "sm",
  className,
}: {
  channelType?: ChannelType | null;
  size?: keyof typeof BADGE_SIZE;
  className?: string;
}) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center", BADGE_SIZE[size], className)}
      title={channelType?.name}
    >
      <ChannelMark name={channelType?.name ?? ""} />
    </span>
  );
}

/** The outbound action for a medium (voice, sms, email, whatsapp...), in the same channel style. */
export function OutboundActionIcon({
  kind,
  className = "size-[18px]",
}: {
  kind: string;
  className?: string;
}) {
  return <ChannelGlyph name={kind} className={className} />;
}

/**
 * The channels a customer attribute carries (phone number: SMS and WhatsApp; voice: CX Voice and
 * Cisco; web: Web and WebRTC) as bare glyphs, one per look. Falls back to the attribute's label when
 * the schema names no channel.
 */
export function ChannelCluster({
  channelTypes,
  fallback,
  className,
}: {
  channelTypes?: { name?: string }[] | string[] | null;
  fallback?: string;
  className?: string;
}) {
  const names = channelTypeNames(channelTypes);
  const shown = distinctChannels(names.length ? names : fallback ? [fallback] : []);
  if (!shown.length) return null;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1", className)} title={names.join(", ")}>
      {shown.map((name) => (
        <ChannelGlyph key={name} name={name} className="size-3.5" />
      ))}
    </span>
  );
}
