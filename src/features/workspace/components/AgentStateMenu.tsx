import { Check, ChevronDown, LogOut, Wifi, WifiOff } from "lucide-react";
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

/**
 * Agent state control (unified-agent app-header state menu): Ready / Not Ready
 * with reason, per-channel (MRD) toggles, state timer and logout with reason.
 */
export function AgentStateMenu() {
  const { t } = useTranslation();
  const presence = useAgentStore((s) => s.presence);
  const since = useAgentStore((s) => s.stateSince);
  const reasons = useAgentStore((s) => s.reasonCodes);
  const pending = useAgentStore((s) => s.pending);
  const canChangeMrd = usePermission({ scope: ["state-change", "manage_state_change"] });
  const socket = useSocketStatus();
  const now = useNow();
  const openConversations = useConversationOrder().length;
  const [activeReason, setActiveReason] = useState<string | null>(null);

  const state = presence?.state?.name ?? null;
  const ready = state === "READY";
  const elapsed = since ? formatDuration((now - since) / 1000, true) : "--:--:--";
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
  const stateLabel = offline ? t("workspace.offline") : state ? titleCase(state) : t("workspace.connecting");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 gap-2 rounded-full ps-1.5 pe-3",
            !offline && ready && "border-success/50 bg-success-soft",
            !offline && state === "NOT_READY" && "border-warning/50 bg-warning-soft",
          )}
          aria-label={t("workspace.agent-state", { state: stateLabel })}
        >
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full text-primary-foreground",
              offline ? "bg-muted-foreground" : ready ? "bg-success" : "bg-warning",
            )}
          >
            {offline ? (
              <WifiOff className="size-3.5" />
            ) : ready ? (
              <Check className="size-3.5" />
            ) : (
              <Wifi className="size-3.5" />
            )}
          </span>
          <span className="hidden text-sm font-medium sm:inline">{stateLabel}</span>
          <span className="text-xs text-muted-foreground tabular">{elapsed}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("workspace.my-state")}
        </DropdownMenuLabel>
        <DropdownMenuItem disabled={pending || offline} onSelect={() => setState("READY", null)}>
          <span className="size-2 rounded-full bg-success" />
          <span className="flex-1">{t("app-header.ready")}</span>
          {ready && <span className="text-xs text-muted-foreground tabular">{elapsed}</span>}
        </DropdownMenuItem>
        {notReadyReasons.map((reason) => (
          <DropdownMenuItem
            key={reason.id}
            disabled={pending || offline}
            onSelect={() => setState("NOT_READY", reason)}
          >
            <span className="size-2 rounded-full bg-warning" />
            <span className="flex-1 truncate">{reason.name}</span>
            {state === "NOT_READY" && (presence?.state?.reasonCode?.id ?? activeReason) === reason.id && (
              <span className="text-xs text-muted-foreground tabular">{elapsed}</span>
            )}
          </DropdownMenuItem>
        ))}

        {canChangeMrd && (presence?.agentMrdStates?.length ?? 0) > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
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
                  disabled={pending || offline}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
