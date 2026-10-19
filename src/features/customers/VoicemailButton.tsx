import { Voicemail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useMatch } from "react-router";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDeskSettings } from "@/core/agent-settings";
import { cn } from "@/shared/lib/utils";
import { useUnreadVoicemailCount } from "./voicemailUnread";

/**
 * Top-bar voicemail shortcut with the agent's unread count (unified-agent header).
 * Hidden on phones, where the navigation menu already lists Voicemail.
 */
export function VoicemailButton() {
  const { t } = useTranslation();
  const settings = useDeskSettings();
  const enabled = Boolean(settings?.voicemail);
  const { data: unread = 0 } = useUnreadVoicemailCount(enabled);
  // Plain class string: the tooltip trigger (Radix Slot) cannot merge NavLink's class function.
  const active = Boolean(useMatch("/voicemail"));
  if (!enabled) return null;
  const label = unread > 0 ? t("voicemail.unread-badge", { count: unread }) : t("nav.voicemail");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/voicemail"
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative hidden size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground sm:grid",
            active && "bg-primary-soft text-primary hover:bg-primary-soft",
          )}
        >
          <Voicemail className="size-[18px]" aria-hidden />
          {unread > 0 && (
            <span className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground tabular ring-2 ring-surface">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
