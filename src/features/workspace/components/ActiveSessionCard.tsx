import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import type { ChannelSession } from "../model/types";
import type { WebChannelInfo } from "../model/webChannel";
import { ChannelBadge } from "./ChannelIcon";
import { WebChannelDetails } from "./WebChannelDetails";

/**
 * One active channel session: channel and customer identifier on one line. A web chat can be
 * opened to show the visitor's device, locale and submitted form; other channels have nothing to open.
 */
export function ActiveSessionCard({
  session,
  identifier,
  info,
  display,
}: {
  session: ChannelSession;
  identifier: string;
  info: WebChannelInfo | null;
  display: (value: unknown, key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const header: ReactNode = (
    <>
      <ChannelBadge channelType={session.channel.channelType} size="md" />
      <span className="min-w-0 flex-1 text-start">
        <span className="block text-sm leading-5 font-medium text-foreground">
          {session.channel.channelType.name}
        </span>
        <span className="block truncate text-xs leading-4 text-muted-foreground tabular-nums">
          {identifier}
        </span>
      </span>
    </>
  );

  return (
    <li className="overflow-hidden rounded-xl border border-border/60 bg-surface">
      {info ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2/60"
        >
          {header}
          <ChevronDown
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2.5">{header}</div>
      )}
      {info && open && (
        <div className="border-t border-border/50 px-3 pb-3">
          <WebChannelDetails info={info} display={display} />
        </div>
      )}
    </li>
  );
}
