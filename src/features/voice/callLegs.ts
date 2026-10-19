import { ccmApi, cimCustomerApi } from "@/core/api";
import { getSession } from "@/core/auth";
import { postCrmEvent } from "@/core/crm-bridge";
import { useConversationStore, type Conversation } from "@/features/workspace";
import type { CallSnapshot, VoiceDialog, VoiceEvent, VoiceStack } from "./callStore";

type LegIntent = "CALL_LEG_STARTED" | "CALL_LEG_ENDED" | "CALL_HOLD" | "CALL_RESUME";
interface VoiceContext {
  customer?: Conversation["customer"];
  conversationId?: string;
}
const contexts = new Map<string, Promise<VoiceContext>>();
const legTimes = new Map<string, number>();
const pipelines = new Map<string, Promise<void>>();
let generation = 0;
export function resetCallLegs() {
  generation++;
  contexts.clear();
  pipelines.clear();
  legTimes.clear();
}

function variable(dialog: VoiceDialog, key: string) {
  return dialog.callVariables?.CallVariable?.find((item) => item.name?.toLowerCase() === key.toLowerCase())
    ?.value;
}
async function contextFor(dialog: VoiceDialog, stack: VoiceStack): Promise<VoiceContext> {
  const conversationId = String(dialog.conversationId ?? variable(dialog, "conversationId") ?? "");
  const conversations = Object.values(useConversationStore.getState().byId);
  const conversation =
    conversations.find((item) => item.conversationId === conversationId) ??
    conversations.find((item) =>
      item.activeChannelSessions.some((session) =>
        session.channelData.additionalAttributes?.some(
          (attr) => attr.key?.toLowerCase() === "callid" && String(attr.value) === dialog.id,
        ),
      ),
    );
  if (conversation) return { customer: conversation.customer, conversationId: conversation.conversationId };
  const identifier = dialog.customerNumber ?? dialog.dialedNumber;
  if (!identifier) return { conversationId: conversationId || undefined };
  const response = await cimCustomerApi.get<{ customer?: Conversation["customer"] }>("/customers", {
    searchParams: {
      channelType: stack === "finesse" ? "cisco_cc" : "cx_voice",
      customerChannelIdentifier: identifier,
    },
  });
  return { customer: response.customer, conversationId: conversationId || undefined };
}
function time(
  dialog: VoiceDialog,
  extension: string,
  field: "startTime" | "stateChangeTime" | "alertingTime",
  fallback: number,
) {
  const value = dialog.participants?.find((participant) => participant.mediaAddress === extension)?.[field];
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) * 1000 : fallback;
}
/** CCM receives the source application's call-leg contract, pinned to the call's customer. */
export function buildCallLegMessage(
  dialog: VoiceDialog,
  intent: LegIntent,
  context: VoiceContext,
  user: { id: string; username: string },
  extension: string,
  reasonCode: string,
  now = Date.now(),
  legTime = now,
) {
  const attrs = (dialog.callVariables?.CallVariable ?? []).map((item) => ({
    key: item.name ?? "",
    type: "String2000",
    value: item.value,
  }));
  if (intent === "CALL_LEG_ENDED")
    attrs.push({ key: "conversationId", type: "String2000", value: context.conversationId });
  const endingReason = dialog.callEndReason?.toUpperCase();
  return {
    id: crypto.randomUUID(),
    header: {
      channelData: {
        channelCustomerIdentifier: dialog.customerNumber ?? dialog.dialedNumber ?? null,
        serviceIdentifier: dialog.serviceIdentifier ?? null,
        additionalAttributes: attrs,
      },
      customer: context.customer,
      language: {},
      timestamp: time(
        dialog,
        extension,
        intent === "CALL_LEG_STARTED" ? "startTime" : "stateChangeTime",
        now,
      ),
      securityInfo: {},
      stamps: [],
      intent,
      entities: {},
      sender: { id: user.id, senderName: user.username, type: "AGENT", additionalDetail: {} },
      conversationId: context.conversationId,
    },
    body: {
      type: "VOICE",
      markdownText: null,
      reasonCode,
      leg: `${dialog.id}:${extension}:${dialog.customerNumber ?? dialog.dialedNumber ?? null}:${time(dialog, extension, "alertingTime", legTime)}`,
      callId: dialog.id,
      dialog,
      ...(intent === "CALL_LEG_ENDED"
        ? {
            endingReason: ["AGENT-HANDLED", "AGENT_HANDLED"].includes(endingReason ?? "")
              ? "AGENT"
              : (endingReason ?? null),
          }
        : {}),
    },
  };
}
export function publishVoiceTransition(
  before: CallSnapshot,
  after: CallSnapshot,
  event: VoiceEvent,
  stack: VoiceStack,
): Promise<void> {
  const dialog = event.dialog ?? event.response?.dialog;
  const user = getSession().user;
  if (!dialog?.id || !user) return Promise.resolve();
  const previous = [before.main, before.consult].find((leg) => leg?.id === dialog.id);
  const next = [after.main, after.consult].find((leg) => leg?.id === dialog.id);
  let intent: LegIntent | null = null;
  if (previous && !next) intent = "CALL_LEG_ENDED";
  else if (next?.phase === "held" && previous?.phase !== "held") intent = "CALL_HOLD";
  else if (previous?.phase === "held" && next?.phase === "active") intent = "CALL_RESUME";
  else if (next?.phase === "active" && previous?.phase !== "active") intent = "CALL_LEG_STARTED";
  if (!intent) return Promise.resolve();
  const id = dialog.id;
  const merged = { ...(previous ?? next)?.dialog, ...dialog };
  const version = generation;
  const extension = user.attributes?.agentExtension?.[0] ?? "";
  const isConsult =
    before.consult?.id === id || after.consult?.id === id || event.event?.toLowerCase() === "consultcall";
  const callType = merged.callType?.toUpperCase() ?? "INBOUND";
  const reason = isConsult
    ? "CONSULT"
    : callType === "MONITORING"
      ? "SILENT_MONITOR"
      : ["OUT", "OUTBOUND"].includes(callType)
        ? "OUTBOUND"
        : callType;
  if (!legTimes.has(id)) legTimes.set(id, Math.floor(Date.now() / 1000) * 1000);
  const legTime = legTimes.get(id)!;
  if (!contexts.has(id))
    contexts.set(
      id,
      isConsult && before.main
        ? (contexts.get(before.main.id) ?? contextFor(before.main.dialog, stack))
        : contextFor(merged, stack),
    );
  const pending = (pipelines.get(id) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const context = await contexts.get(id)!;
      if (version !== generation || getSession().user?.id !== user.id) return;
      const message = buildCallLegMessage(
        merged,
        intent!,
        context,
        user,
        extension,
        reason,
        Date.now(),
        legTime,
      );
      await ccmApi.post("/message/receive", message);
      if (intent === "CALL_LEG_ENDED" && version === generation && getSession().user?.id === user.id)
        postCrmEvent({
          event: "Dialog_Ended",
          agentData: { conversationId: context.conversationId, agentData: message },
        });
    });
  pipelines.set(id, pending);
  return pending.finally(() => {
    if (intent === "CALL_LEG_ENDED" && pipelines.get(id) === pending) {
      contexts.delete(id);
      pipelines.delete(id);
      legTimes.delete(id);
    }
  });
}
