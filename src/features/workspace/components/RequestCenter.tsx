import { ArrowRightLeft, Check, Hand, Users, X } from "lucide-react";
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

function Card({
  tone,
  children,
}: {
  tone: "chat" | "transfer" | "consult" | "pull" | "hand";
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "pointer-events-auto flex w-[22rem] max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border bg-surface p-3 shadow-pop",
        "animate-in fade-in-0 slide-in-from-top-2",
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

function CustomerName({ name }: { name?: string }) {
  const { t } = useTranslation();
  const masked = useMaskedValue(name, "firstName", "view_pii");
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
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2">
        {isTransfer ? (
          <ArrowRightLeft className="size-4 text-primary" />
        ) : isConsult ? (
          <Users className="size-4 text-warning-text" />
        ) : (
          <ChannelIcon channelType={request.channelSession?.channel?.channelType} className="size-5" />
        )}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        {isTransfer || isConsult ? (
          <p className="leading-snug">
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
            <p className="truncate font-semibold">
              <CustomerName name={customer?.firstName} />
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {request.cisco_data
                ? (request.channelSession?.channelData?.channelCustomerIdentifier ??
                  t("globals.not-applicable"))
                : t("workspace.new-request-on", {
                    channel: request.channelSession?.channel?.channelType?.name ?? "",
                  })}
            </p>
          </>
        )}
        {request.note && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{request.note}</p>}
      </div>
      <Button size="sm" onClick={accept}>
        <Check className="size-4" /> {t("globals.accept")}
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
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2">
        <ChannelIcon channelType={request.channelSession?.channel?.channelType} className="size-5" />
      </div>
      <p className="min-w-0 flex-1 text-sm leading-snug">
        {t("globals.new-conversation-from")}{" "}
        <strong>
          <CustomerName name={request.channelSession?.customer?.firstName} />
        </strong>{" "}
        {t("globals.in")} <strong>'{listName ?? "-"}'</strong> {t("pull-mode.list")}
      </p>
      <div className="flex shrink-0 gap-1">
        {request.listId && (
          <Button
            size="sm"
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
          size="icon"
          variant="ghost"
          aria-label={t("globals.close")}
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
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive-soft text-destructive-text">
        <Hand className="size-5" />
      </div>
      <p className="min-w-0 flex-1 text-sm leading-snug">
        {t("workspace.hand-raised-by", { name: notice.agentName ?? "" })}
      </p>
      <div className="flex shrink-0 gap-1">
        {notice.event.channelSession && (
          <Button
            size="sm"
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
        <Button size="icon" variant="ghost" aria-label={t("globals.close")} onClick={dismiss}>
          <X className="size-4" />
        </Button>
      </div>
    </Card>
  );
}

/** Stack of incoming requests, top-right above every page (unified-agent chat-notifications). */
export function RequestCenter() {
  const { t } = useTranslation();
  const push = useRequestStore((s) => s.push);
  const pull = useRequestStore((s) => s.pull);
  const hands = useRequestStore((s) => s.handRaises);
  if (!push.length && !pull.length && !hands.length) return null;
  return (
    <div
      className="pointer-events-none fixed end-4 top-16 z-50 flex max-h-[calc(100vh-5rem)] flex-col gap-2 overflow-y-auto"
      aria-live="assertive"
    >
      {push.map((r) => (
        <PushCard key={r.conversationId} request={r} />
      ))}
      {pull.map((r) => (
        <PullCard key={r.id} request={r} />
      ))}
      {pull.length > 1 && (
        <Button
          size="sm"
          variant="outline"
          className="pointer-events-auto self-end"
          onClick={() => {
            useRequestStore.getState().clearPull();
            sounds.stopRing();
          }}
        >
          {t("globals.dismiss-all")}
        </Button>
      )}
      {hands.map((n) => (
        <HandRaiseCard key={n.event.conversationId} notice={n} />
      ))}
    </div>
  );
}
