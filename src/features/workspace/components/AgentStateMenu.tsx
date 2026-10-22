import { Check, ChevronDown, LogOut, WifiOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { logout, usePermission } from "@/core/auth";
import { formatDuration } from "@/core/i18n";
import { useSocketStatus } from "@/core/realtime";
import { useNow } from "@/shared/hooks/useNow";
import { cn } from "@/shared/lib/utils";
import { changeAgentState, changeMrdState } from "../session/commands";
import { DEFAULT_LOGOUT_REASON } from "../session/agentSession";
import { isMrdOn, logoutBlocked, useAgentStore, type ReasonCode } from "../store/agentStore";
import { useConversationOrder } from "../store/conversationStore";

const titleCase = (s: string) =>
  s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

function mrdLabel(name: string) {
  const n = name.toLowerCase();
  return n === "cx voice" ? "CX Voice" : n === "cisco cc" ? "Cisco CC" : titleCase(n);
}

function StatusDot({
  offline,
  connecting,
  ready,
}: {
  offline: boolean;
  connecting: boolean;
  ready: boolean;
}) {
  return (
    <span className="relative flex size-2.5 shrink-0">
      <span
        className={cn(
          "relative size-2.5 rounded-full shadow-2xs",
          offline && "bg-muted-foreground",
          connecting && "bg-primary",
          !offline && !connecting && ready && "bg-success",
          !offline && !connecting && !ready && "bg-warning",
        )}
      />
    </span>
  );
}

/** One clock: a label over a fixed-width time, both on the same grid so neighbours line up. */
function TimeStat({
  label,
  value,
  tone = "quiet",
}: {
  label: string;
  value: string;
  tone?: "ready" | "away" | "quiet";
}) {
  return (
    <span
      className="grid min-w-[4rem] grid-rows-[auto_auto] justify-items-center gap-y-0.5 text-center"
      title={`${label} ${value}`}
    >
      <span
        className={cn(
          "max-w-[8rem] truncate text-xs leading-4 font-medium text-muted-foreground",
          tone === "ready" && "text-success-text",
          tone === "away" && "text-warning-text",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-sm leading-5 tracking-tight tabular-nums",
          tone === "quiet" ? "font-medium text-foreground/80" : "font-semibold text-foreground",
        )}
      >
        {value}
      </span>
    </span>
  );
}

/**
 * Agent state control (unified-agent app-header state menu): Ready / Not Ready
 * with reason, per-channel (MRD) toggles, and logout with reason.
 * The bar shows how long the current state has lasted, and how long the agent has been logged in.
 */
export function AgentStateMenu() {
  const { t } = useTranslation();
  const presence = useAgentStore((s) => s.presence);
  const since = useAgentStore((s) => s.stateSince);
  const loginAt = useAgentStore((s) => s.loginAt);
  const reasons = useAgentStore((s) => s.reasonCodes);
  const pending = useAgentStore((s) => s.pending);
  const canChangeMrd = usePermission({ scope: ["state-change", "manage_state_change"] });
  const socket = useSocketStatus();
  const now = useNow();
  const openConversations = useConversationOrder().length;
  const [activeReason, setActiveReason] = useState<string | null>(null);

  const state = presence?.state?.name ?? null;
  const ready = state === "READY";
  const notReady = state === "NOT_READY";
  const loggedIn = loginAt ? formatDuration((now - loginAt) / 1000, true) : "--:--:--";
  const stateClock = since ? formatDuration((now - since) / 1000, true) : "--:--:--";
  const blocked = logoutBlocked(presence);
  const notReadyReasons = reasons.filter((r) => r.type?.toLowerCase() === "not_ready");
  const logoutReasons = reasons.filter((r) => r.type?.toLowerCase() === "logout");

  const setState = (name: "READY" | "NOT_READY", reason: ReasonCode | null) => {
    useAgentStore.getState().setPending(true);
    setActiveReason(reason?.id ?? null);
    changeAgentState({ name, reasonCode: reason });
  };

  const doLogout = (reason: ReasonCode | null) => {
    if (blocked) {
      toast.error(
        t(blocked === "state" ? "app-header.logout-disabled-state" : "app-header.logout-disabled-active"),
      );
      return;
    }
    void logout(reason ?? DEFAULT_LOGOUT_REASON);
  };

  const offline = socket !== "connected";
  const connecting = socket === "connecting";
  const reasonName =
    state === "NOT_READY"
      ? (presence?.state?.reasonCode?.name ?? reasons.find((r) => r.id === activeReason)?.name ?? null)
      : null;
  const stateLabel = offline
    ? t("workspace.offline")
    : connecting
      ? t("workspace.connecting")
      : state
        ? titleCase(state)
        : t("workspace.connecting");
  const live = !offline && !connecting;
  const stateClockLabel = !live ? stateLabel : reasonName || stateLabel;
  const ariaTimes = `${stateClockLabel} ${live ? stateClock : ""}. ${t("workspace.logged-in-time")} ${loggedIn}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            // One soft pill, no outline or divider; the has-[>svg] overrides cancel the Button size's own icon padding.
            "h-12 gap-3 rounded-full bg-control ps-4 pe-3 font-normal shadow-none transition-colors hover:bg-control-hover has-[>svg]:ps-4 has-[>svg]:pe-3",
            pending && "opacity-80",
          )}
          aria-label={`${t("workspace.agent-state", { state: stateLabel })}. ${ariaTimes}`}
        >
          <StatusDot offline={offline} connecting={connecting} ready={ready} />
          <TimeStat
            label={stateClockLabel}
            value={live ? stateClock : "--:--:--"}
            tone={live && ready ? "ready" : live && notReady ? "away" : "quiet"}
          />
          <TimeStat label={t("workspace.logged-in-time")} value={loggedIn} />
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-2xl border-border/60 bg-surface/95 p-1.5 shadow-lift backdrop-blur-xl"
      >
        <DropdownMenuItem
          disabled={pending || offline || connecting}
          onSelect={(e) => {
            e.preventDefault();
            setState("READY", null);
          }}
        >
          <span className="size-2 rounded-full bg-success" />
          <span className="flex-1">{t("app-header.ready")}</span>
          {ready && !offline && <Check className="size-4 text-muted-foreground" />}
        </DropdownMenuItem>
        {notReadyReasons.map((reason) => (
          <DropdownMenuItem
            key={reason.id}
            disabled={pending || offline || connecting}
            onSelect={(e) => {
              e.preventDefault();
              setState("NOT_READY", reason);
            }}
          >
            <span className="size-2 rounded-full bg-warning" />
            <span className="flex-1 truncate">{reason.name}</span>
            {state === "NOT_READY" && (presence?.state?.reasonCode?.id ?? activeReason) === reason.id && (
              <Check className="size-4 text-muted-foreground" />
            )}
          </DropdownMenuItem>
        ))}

        {canChangeMrd && (presence?.agentMrdStates?.length ?? 0) > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {t("app-header.channel-categories")}
            </DropdownMenuLabel>
            {presence!.agentMrdStates.map((m) => (
              <div key={m.mrd.id} className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
                <span className="min-w-0 truncate">
                  {mrdLabel(m.mrd.name)}{" "}
                  <span className="text-xs text-muted-foreground">({titleCase(m.state)})</span>
                </span>
                <Switch
                  checked={isMrdOn(m.state)}
                  disabled={pending || offline || connecting}
                  aria-label={mrdLabel(m.mrd.name)}
                  onCheckedChange={(on) => {
                    useAgentStore.getState().setPending(true);
                    changeMrdState(m.mrd.id, on ? "READY" : "NOT_READY");
                  }}
                />
              </div>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        {logoutReasons.length > 0 && !blocked ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <LogOut className="size-4" /> {t("app-header.logout")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {logoutReasons.map((reason) => (
                <DropdownMenuItem key={reason.id} onSelect={() => doLogout(reason)}>
                  {reason.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DropdownMenuItem disabled={Boolean(blocked)} onSelect={() => doLogout(null)}>
                  <LogOut className="size-4" />
                  <span className="flex-1">{t("app-header.logout")}</span>
                </DropdownMenuItem>
              </div>
            </TooltipTrigger>
            {blocked && (
              <TooltipContent side="left">
                {t(
                  blocked === "state"
                    ? "app-header.logout-disabled-state"
                    : "app-header.logout-disabled-active",
                )}
              </TooltipContent>
            )}
          </Tooltip>
        )}
        {openConversations > 0 && blocked === "active" && (
          <p className="px-2 pb-1.5 text-xs text-muted-foreground">
            {t("app-header.logout-disabled-active")}
          </p>
        )}
        {(offline || connecting) && (
          <p className="flex items-center gap-1.5 px-2 pb-1.5 text-xs text-muted-foreground">
            <WifiOff className="size-3.5 shrink-0" aria-hidden />
            {offline ? t("workspace.connection-lost-hint") : t("workspace.connection-reconnecting-hint")}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
