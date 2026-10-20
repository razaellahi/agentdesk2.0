import { createElement } from "react";
import { BrandIcon } from "@/components/common/BrandIcons";
import { cn } from "@/shared/lib/utils";
import { channelLook } from "../model/channelIcons";
import type { ChannelType } from "../model/types";

/**
 * A channel in one coloured style everywhere: its logo for social and messaging channels, and a coloured
 * round badge with a white line icon for the rest. `name` is a channel name or an identifier label.
 */
export function ChannelMark({ name, className }: { name: string; className?: string }) {
  const look = channelLook(name);
  // One container for every channel: a white round tile with a hairline ring. Inside it, the channel's own
  // logo, or its line icon in the channel colour. Same shape, weight and spacing everywhere.
  return (
    <span
      className={cn(
        "grid size-full place-items-center rounded-full bg-surface shadow-2xs ring-1 ring-border/70",
        className,
      )}
    >
      {look.kind === "brand" ? (
        <BrandIcon channel={look.brand} className="size-[64%]" />
      ) : (
        createElement(look.Icon, {
          className: cn("size-[52%]", look.tone),
          strokeWidth: 1.9,
          "aria-hidden": true,
        })
      )}
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
export function OutboundActionIcon({ kind, className = "size-3.5" }: { kind: string; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center", className)} aria-hidden>
      <ChannelMark name={kind} />
    </span>
  );
}
