import { ArrowRightLeft, Check, ChevronDown, Hand, Users, X } from "lucide-react";
import { channelLabel } from "../model/display";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { sounds } from "@/core/notifications";
import { cn } from "@/shared/lib/utils";
import { useMaskedValue } from "../hooks/useMaskedValue";
import { joinPullModeRequest, subscribeTopic } from "../session/commands";
import { usePullModeStore } from "../store/pullModeStore";
import {
  useRequestStore,
  type HandRaiseNotice,
  type PullRequest,
  type PushRequest,
} from "../store/requestStore";
import { ChannelIcon } from "./ChannelIcon";
import { WORKSPACE_PATH } from "./AgentSessionProvider";

type Tone = "chat" | "transfer" | "consult" | "pull" | "hand";

function Card({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-surface py-2 ps-2.5 pe-2 text-sm shadow-sm",
        "motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in-0 motion-safe:slide-in-from-top-2",
        tone === "chat" && "border-s-4 border-s-success",
        tone === "transfer" && "border-s-4 border-s-primary",
        tone === "consult" && "border-s-4 border-s-warning",
        tone === "pull" && "border-s-4 border-s-border-primary",
        tone === "hand" && "border-s-4 border-s-destructive",
      )}
    >
      {children}
    </div>
  );
}

function CardIcon({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-surface-2", className)}>
      {children}
    </div>
  );
}

function CustomerName({ name }: { name?: string }) {
  const { t } = useTranslation();
  // unified-agent chat-notifications: view_pii shows the name, otherwise the "manage" pipe.
  const masked = useMaskedValue(name, "firstName", "manage", { preferViewPii: true });
  return <>{name ? masked : t("globals.UNIDENTIFIED-CUSTOMER")}</>;
}

function PushCard({ request }: { request: PushRequest }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const direction = request.taskDirection;
  const accept = () => {
    subscribeTopic(
      request.conversationId,
      request.roomInfo,
      request.taskId,
      direction === "CONSULT" ? "ASSISTANT" : "PRIMARY",
    );
    useRequestStore.getState().removePush(request.conversationId);
    if (!useRequestStore.getState().push.length) sounds.stopRing();
    navigate(WORKSPACE_PATH);
  };
  const isTransfer = direction === "DIRECT_TRANSFER" || direction === "DIRECT_CONFERENCE";
  const isConsult = direction === "CONSULT";
  const customer = request.channelSession?.customer;

  return (
    <Card tone={isConsult ? "consult" : isTransfer ? "transfer" : "chat"}>
      <CardIcon>
        {isTransfer ? (
          <ArrowRightLeft className="size-5 text-primary" />
        ) : isConsult ? (
          <Users className="size-5 text-warning-text" />
        ) : (
          <ChannelIcon channelType={request.channelSession?.channel?.channelType} className="size-5" />
        )}
      </CardIcon>
      <div className="min-w-0 flex-1">
        {isTransfer || isConsult ? (
          <p className="line-clamp-2 text-xs leading-snug">
            {isConsult
              ? t("chat-features.interactions.Consult")
              : `${t("globals.conversation")} ${t(direction === "DIRECT_CONFERENCE" ? "globals.conference" : "globals.transfer")}`}{" "}
            {t("globals.request-from")} <strong>{request.requestedBy}</strong> {t("globals.with-customer")}{" "}
            <strong>
              <CustomerName name={customer?.firstName} />
            </strong>
          </p>
        ) : (
          <>
            <p className="truncate leading-tight font-semibold">
              <CustomerName name={customer?.firstName} />
            </p>
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {request.cisco_data
                ? (request.channelSession?.channelData?.channelCustomerIdentifier ??
                  t("globals.not-applicable"))
                : t("workspace.new-request-on", {
                    channel: channelLabel(request.channelSession?.channel?.channelType?.name),
                  })}
            </p>
          </>
        )}
        {request.note && (
          <p className="truncate text-xs text-muted-foreground" title={request.note}>
            {request.note}
          </p>
        )}
      </div>
      <Button size="sm" className="h-8 shrink-0 rounded-full px-3.5 text-xs font-medium" onClick={accept}>
        <Check className="size-3.5" /> {t("globals.accept")}
      </Button>
    </Card>
  );
}

function PullCard({ request }: { request: PullRequest }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const listName = usePullModeStore((s) => s.listNames[request.listId]);
  return (
    <Card tone="pull">
      <CardIcon>
        <ChannelIcon channelType={request.channelSession?.channel?.channelType} className="size-5" />
      </CardIcon>
      <p className="line-clamp-2 min-w-0 flex-1 text-xs leading-snug">
        {t("globals.new-conversation-from")}{" "}
        <strong>
          <CustomerName name={request.channelSession?.customer?.firstName} />
        </strong>{" "}
        {t("globals.in")} <strong>'{listName ?? "-"}'</strong> {t("pull-mode.list")}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        {request.listId && (
          <Button
            size="sm"
            className="h-8 rounded-full px-3 text-xs font-medium"
            onClick={() => {
              joinPullModeRequest(request.channelSession, "PRIMARY", request.id);
              useRequestStore.getState().removePull(request.id);
              sounds.stopRing();
              navigate(WORKSPACE_PATH);
            }}
          >
            {t("pull-mode.join")}
          </Button>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t("globals.close")}
          className="size-8 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          onClick={() => {
            useRequestStore.getState().removePull(request.id);
            sounds.stopRing();
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
    </Card>
  );
}

function HandRaiseCard({ notice }: { notice: HandRaiseNotice }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dismiss = () => {
    useRequestStore.getState().removeHandRaise(notice.event.conversationId);
    sounds.stopRing();
  };
  return (
    <Card tone="hand">
      <CardIcon className="bg-destructive-soft text-destructive-text">
        <Hand className="size-4" />
      </CardIcon>
      <p className="line-clamp-2 min-w-0 flex-1 text-xs leading-snug">
        {t("workspace.hand-raised-by", { name: notice.agentName ?? "" })}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        {notice.event.channelSession && (
          <Button
            size="sm"
            className="h-8 rounded-full px-3 text-xs font-medium"
            onClick={() => {
              // Supervisor joins as WHISPER, exactly like Active Chats.
              joinPullModeRequest(notice.event.channelSession!, "WHISPER");
              dismiss();
              navigate(WORKSPACE_PATH);
            }}
          >
            {t("workspace.join")}
          </Button>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t("globals.close")}
          className="size-8 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          onClick={dismiss}
        >
          <X className="size-4" />
        </Button>
      </div>
    </Card>
  );
}

/**
 * Incoming requests (unified-agent chat-notifications). On desktop they sit in
 * the top bar's free middle, so they never cover a pane's controls or shift the
 * layout under the agent's cursor; extra requests wait behind a "+N" list. On
 * small screens (`layout="strip"`) they render in flow below the top bar.
 */
export function RequestCenter({ layout = "bar" }: { layout?: "bar" | "strip" }) {
  const { t } = useTranslation();
  const push = useRequestStore((s) => s.push);
  const pull = useRequestStore((s) => s.pull);
  const hands = useRequestStore((s) => s.handRaises);
  const [expanded, setExpanded] = useState(false);
  const cards = [
    ...push.map((r) => <PushCard key={`push:${r.conversationId}`} request={r} />),
    ...hands.map((n) => <HandRaiseCard key={`hand:${n.event.conversationId}`} notice={n} />),
    ...pull.map((r) => <PullCard key={`pull:${r.id}`} request={r} />),
  ];
  if (!cards.length) return null;
  const dismissAll = pull.length > 1 && (
    <Button
      size="sm"
      variant="outline"
      className="self-end"
      onClick={() => {
        useRequestStore.getState().clearPull();
        sounds.stopRing();
      }}
    >
      {t("globals.dismiss-all")}
    </Button>
  );

  if (layout === "strip")
    return (
      <section
        aria-label={t("workspace.incoming-requests")}
        aria-live="assertive"
        className="flex flex-col gap-2 px-3 pt-2"
      >
        {cards}
        {dismissAll}
      </section>
    );

  const [first, ...rest] = cards;
  return (
    <section
      aria-label={t("workspace.incoming-requests")}
      aria-live="assertive"
      className="relative flex max-w-[30rem] min-w-[17rem] flex-1 items-center gap-1.5"
    >
      <div className="min-w-0 flex-1">{first}</div>
      {rest.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 rounded-xl"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {t("workspace.more-requests", { count: rest.length })}
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </Button>
      )}
      {expanded && rest.length > 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 flex max-h-[60vh] flex-col gap-2 overflow-y-auto rounded-2xl border bg-surface p-2 shadow-lift">
          {rest}
          {dismissAll}
        </div>
      )}
    </section>
  );
}
