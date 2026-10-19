import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCurrentUser, usePermission } from "@/core/auth";
import type { OutboundComposeRequest } from "@/features/customers";
import { placeOutboundVoice, useCallStore } from "@/features/voice";
import {
  getOutboundFromChannels,
  hasOptOutLabel,
  OutboundStartError,
  startIdentifierConversation,
  startOutboundSms,
} from "../api/outbound";
import {
  planOutbound,
  type OutboundKind,
  type OutboundOption,
  type OutboundReason,
  type OutboundTarget,
} from "../model/outboundPlan";
import type { Conversation } from "../model/types";
import { requestComposerFocus } from "../store/composerFocus";
import { useConversationStore } from "../store/conversationStore";
import { useCustomerContext } from "./useCustomerContext";

const CHANNEL_TYPE: Record<Exclude<OutboundKind, "voice">, string> = {
  sms: "SMS",
  whatsapp: "WHATSAPP",
  email: "EMAIL",
  twitter: "TWITTER",
};

const BLOCKED_KEY = {
  OPT_OUT: "snackbar.Outbound-Blocked-Opt-Out",
  DNC: "snackbar.Outbound-Blocked-DNC",
  DNC_CHECK_FAILED: "snackbar.Outbound-DNC-Check-Failed",
} as const;

export interface ReachTarget extends OutboundTarget {
  /** Masked per the agent's PII scope; `value` stays raw for the request only. */
  display: string;
}
export type ReachOption = Omit<OutboundOption, "targets"> & {
  targets: ReachTarget[];
  /** Masked identifier of the session being continued (state "continue"). */
  sessionDisplay?: string;
};

/**
 * Everything the conversation offers for reaching its customer, shared by the
 * header "Reach customer" panel, the Outbound tab and the identifier chips so
 * they always agree. Channel configuration is fetched only while `active`.
 */
export function useOutboundReach(conversation: Conversation, active: boolean) {
  const { t } = useTranslation();
  const ctx = useCustomerContext(conversation);
  const user = useCurrentUser();
  const inSession = usePermission("agentSession");
  const canInitiate = usePermission("initiateChat");
  const registered = useCallStore((s) => s.registered);
  const idle = useCallStore((s) => s.phase === "idle");
  const [busy, setBusy] = useState<OutboundKind | null>(null);
  const [composeRequest, setComposeRequest] = useState<OutboundComposeRequest | null>(null);
  const settings = ctx.settings;
  const permitted = inSession && canInitiate;
  const enabled: Record<OutboundKind, boolean> = {
    voice: Boolean(settings?.cxVoice || settings?.cisco),
    sms: Boolean(settings?.outboundSms),
    whatsapp: true,
    email: true,
    twitter: true,
  };
  const kinds = Object.keys(CHANNEL_TYPE) as (keyof typeof CHANNEL_TYPE)[];
  const channelQueries = useQueries({
    queries: kinds.map((kind) => ({
      queryKey: ["outbound-channels", user?.id, CHANNEL_TYPE[kind]],
      queryFn: () => getOutboundFromChannels(CHANNEL_TYPE[kind]),
      enabled: active && permitted && enabled[kind],
      staleTime: 60_000,
    })),
  });
  const configured: Partial<Record<OutboundKind, boolean | undefined>> = { voice: true };
  kinds.forEach((kind, i) => {
    const query = channelQueries[i]!;
    configured[kind] = query.isError ? false : query.data ? Boolean(query.data.selected) : undefined;
  });

  const customer = ctx.customer as Record<string, unknown>;
  const plan = planOutbound({
    customer,
    sessions: conversation.activeChannelSessions,
    schema: ctx.schema,
    enabled,
    configured,
    permitted,
    optedOut: hasOptOutLabel(customer as { labels?: unknown[] }),
    phone: { registered, idle },
  });
  const options: ReachOption[] = plan.options.map((option) => {
    const session = conversation.activeChannelSessions.find((item) => item.id === option.sessionId);
    const sessionId = session?.channelData.channelCustomerIdentifier;
    return {
      ...option,
      targets: option.targets.map((target) => ({
        ...target,
        display: String(ctx.display(target.value, target.attrKey)),
      })),
      sessionDisplay: sessionId
        ? String(ctx.display(sessionId, option.targets[0]?.attrKey ?? "phoneNumber"))
        : undefined,
    };
  });

  const reasonText = (reason: OutboundReason | undefined, kind: OutboundKind) =>
    reason ? t(`workspace.reach.reason.${reason}`, { channel: t(`workspace.reach.channel.${kind}`) }) : "";

  /** Reply on the channel the customer is already on, in this conversation's composer. */
  const continueOn = (option: ReachOption) => {
    if (!option.sessionId) return;
    useConversationStore.getState().selectReplySession(conversation.conversationId, option.sessionId);
    requestComposerFocus(conversation.conversationId);
  };

  const run = async (kind: OutboundKind, task: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(kind);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  };

  const doc = conversation.customer as OutboundComposeRequest["customer"];
  /** Compliance failures from the outbound APIs ("Outbound … blocked: REASON") in the agent's language. */
  const reportFailure = (error: Error) => {
    const blocked = /blocked: (\w+)/.exec(error.message)?.[1] as keyof typeof BLOCKED_KEY | undefined;
    toast.error(blocked && BLOCKED_KEY[blocked] ? t(BLOCKED_KEY[blocked]) : error.message);
  };

  /** Dials a number (profile or typed); placeOutboundVoice runs the compliance check. */
  const call = (number: string, serviceIdentifier?: string) =>
    run("voice", () => placeOutboundVoice(number, { customer: doc, serviceIdentifier }).catch(reportFailure));

  /** Sends a first SMS to start a conversation; startOutboundSms runs the compliance check. */
  const sendSms = (destination: string, from: string, text: string) => {
    let sent = false;
    return run("sms", () =>
      startOutboundSms({ destination, from, text, customer: doc })
        .then(() => {
          sent = true;
          toast.success(t("snackbar.Outbound-Message-Sent-Successfully"));
        })
        .catch(reportFailure),
    ).then(() => sent);
  };

  const start = (option: ReachOption, target: ReachTarget) => {
    if (option.state === "continue") return continueOn(option);
    if (option.state !== "ready") return;
    if (option.kind === "voice") return call(target.value);
    if (option.kind === "twitter")
      return run("twitter", () =>
        startIdentifierConversation({ identifier: target.value, channelTypeName: "TWITTER", customer: doc })
          .then(() =>
            toast.success(t("workspace.outbound-started", { channel: t("workspace.reach.channel.twitter") })),
          )
          .catch((error: unknown) => {
            if (error instanceof OutboundStartError && error.code in BLOCKED_KEY)
              toast.error(t(BLOCKED_KEY[error.code as keyof typeof BLOCKED_KEY]));
            else toast.error(reasonText("NOT_CONFIGURED", "twitter"));
          }),
      );
    setComposeRequest({
      channel: CHANNEL_TYPE[option.kind] as OutboundComposeRequest["channel"],
      destination: target.value,
      customer: doc,
      complianceEnabled: settings?.callingCompliance,
    });
  };

  return {
    options,
    optedOut: plan.optedOut,
    busy,
    start,
    call,
    sendSms,
    continueOn,
    reasonText,
    composeRequest,
    closeCompose: () => setComposeRequest(null),
    full: ctx.full,
  };
}
