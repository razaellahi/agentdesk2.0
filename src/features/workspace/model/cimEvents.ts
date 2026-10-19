import {
  addSeenBy,
  applyCommentAction,
  computeWaitingSince,
  hasNonVoiceSession,
  isVoiceSession,
  markSeenUntil,
  mergeBotSuggestions,
  messageRole,
  remainingSeconds,
  type ModelContext,
} from "./conversation";
import { channelSessionEndedReason, lower, systemMessageFor } from "./systemMessages";
import type { CimEvent, CimMessage, Conversation } from "./types";

/** Side effects requested by a reducer; executed by the session layer (toasts, sounds, CRM, socket). */
export type Effect =
  | { kind: "toast"; variant: "success" | "error" | "info"; message: string }
  | { kind: "incomingMessage"; conversationId: string; event: CimEvent }
  | { kind: "crm"; payload: unknown }
  | { kind: "conversationData"; payload: unknown }
  | { kind: "whisperCheck" }
  | { kind: "channelSessionEnded"; conversationId: string }
  | { kind: "emitHandRaise"; conversationId: string }
  | { kind: "monitoredVoiceEnded" }
  | { kind: "externalGadget"; conversationId: string; data: unknown };

const TYPING_MS = 5000;

function pushSystem(conversation: Conversation, event: CimEvent, ctx: ModelContext) {
  const message = systemMessageFor(event, ctx);
  if (message) conversation.messages.push(message);
}

function touch(conversation: Conversation, message: CimMessage, now: number) {
  conversation.lastMessageAt = Number(message.header.timestamp) || now;
  conversation.waitingSince = computeWaitingSince(conversation.messages);
}

/** Selects the web / whatsapp session that a customer just wrote on (processActiveChannelSessions). */
function followCustomerChannel(conversation: Conversation, incoming: CimMessage["header"]["channelSession"]) {
  const type = lower(
    (incoming as { channel?: { channelType?: { name?: string } } } | undefined)?.channel?.channelType?.name,
  );
  if (type !== "web" && type !== "whatsapp") return;
  const target = conversation.activeChannelSessions.find((s) => lower(s.channel.channelType.name) === type);
  if (!target || target.isChecked) return;
  conversation.activeChannelSessions.forEach((s) => (s.isChecked = false));
  target.isChecked = true;
}

function startSlaIfIdle(conversation: Conversation, now: number) {
  if (conversation.hold.active) return;
  const running = conversation.sla.deadline !== null && conversation.sla.deadline > now;
  if (!running && conversation.sla.totalDuration > 0) {
    conversation.sla.deadline = now + conversation.sla.totalDuration * 1000;
    conversation.sla.color = "sla-normal";
  }
}

export function stopSla(conversation: Conversation) {
  conversation.sla.deadline = null;
  conversation.sla.popup = false;
  conversation.sla.color = "sla-normal";
}

/**
 * Applies one onCimEvent to its conversation (mutates the draft; call inside immer).
 * Port of unified-agent socketService.onCimEventHandler and its sub-handlers.
 */
export function applyCimEvent(conversation: Conversation, event: CimEvent, ctx: ModelContext): Effect[] {
  const effects: Effect[] = [];
  const name = lower(event.name);
  const { now } = ctx;
  if (event.channelSession && event.data?.header) event.data.header.channelSession = event.channelSession;

  if (["agent_message", "bot_message", "customer_message", "whisper_message"].includes(name)) {
    const data = event.data as CimMessage;
    const bodyType = lower(data.body.type);
    if (bodyType === "plain" || (bodyType === "comment" && lower(data.body.itemType) === "text")) {
      conversation.aiContext.push({
        role: messageRole(event.name),
        text: String(data.body.markdownText ?? ""),
      });
    }
    if (bodyType === "wrapup" && data.header?.sender?.id === ctx.agentId) {
      conversation.appliedWrapUps.push(...((data.body.wrapups as unknown[]) ?? []));
    }
    if (name === "agent_message" && bodyType !== "wrapup") stopSla(conversation);
    else if (name === "customer_message") startSlaIfIdle(conversation, now);

    if (name !== "agent_message")
      effects.push({ kind: "incomingMessage", conversationId: conversation.conversationId, event });

    if (lower(data.header.sender?.type) === "connector") {
      const c = data.header.customer as
        { _id: string; firstName?: string; lastName?: string | null } | undefined;
      // unified-agent built "First Last" via an operator-precedence slip that yields only the last name;
      // the full name is what was intended.
      data.header.sender = {
        ...data.header.sender,
        id: c?._id ?? conversation.customer._id,
        type: "CUSTOMER",
        senderName: [c?.firstName, c?.lastName].filter(Boolean).join(" ") || conversation.customer.firstName,
      };
      if (bodyType !== "notification") conversation.typingUntil = null;
      followCustomerChannel(conversation, data.header.channelSession);
    }
    if (name === "customer_message" || name === "bot_message") conversation.unread += 1;

    const itemType = lower(data.body.itemType);
    if (
      name === "agent_message" &&
      bodyType === "comment" &&
      !["text", "video", "image", "private_reply"].includes(itemType)
    ) {
      applyCommentAction(conversation.messages, data);
    } else if (name === "agent_message" || name === "whisper_message") {
      const existing = conversation.messages.find((m) => m.id === data.id);
      const isWhisper = name === "whisper_message";
      if (existing) {
        existing.header.status = "sent";
        existing.body.isWhisper = isWhisper;
      } else {
        data.header.status = "sent";
        data.body.isWhisper = isWhisper;
        if (data.header.intent === "UPDATE") {
          const original = conversation.messages.find((m) => m.id === data.header.originalMessageId);
          if (original) {
            original.body.markdownText = data.body.markdownText;
            original.isEdited = true;
          }
        } else {
          conversation.messages.push(data);
        }
      }
    } else {
      conversation.messages.push(data);
    }
    touch(conversation, data, now);
    return effects;
  }

  if (lower(event.type) === "suggestion") {
    mergeBotSuggestions(conversation, event.data);
    return effects;
  }

  switch (name) {
    case "channel_session_started": {
      const session = event.data;
      if (isVoiceSession(session)) {
        session.isDisabled = true;
        session.isChecked = false;
      } else {
        conversation.activeChannelSessions.forEach((s) => (s.isChecked = false));
        session.isChecked = true;
        session.isDisabled = false;
      }
      conversation.activeChannelSessions.push(session);
      pushSystem(conversation, event, ctx);
      conversation.composerEnabled = hasNonVoiceSession(conversation.activeChannelSessions);
      break;
    }
    case "channel_session_ended": {
      pushSystem(conversation, event, ctx);
      const index = conversation.activeChannelSessions.findIndex((s) => s.id === event.data.id);
      if (index >= 0) {
        const [removed] = conversation.activeChannelSessions.splice(index, 1);
        if (
          removed &&
          lower(removed.channel.channelType.name) === "cx_voice" &&
          conversation.topicParticipant.role === "SILENT_MONITOR"
        ) {
          effects.push({ kind: "monitoredVoiceEnded" });
        }
        if (removed?.isChecked) {
          const next = conversation.activeChannelSessions.find(
            (s) => !isVoiceSession(s) && lower(s.channel.channelType.name) !== "facebook",
          );
          if (next) next.isChecked = true;
        }
        conversation.composerEnabled = hasNonVoiceSession(conversation.activeChannelSessions);
      }
      const reason = lower(event.data?.state?.reasonCode);
      if (event.data && !["agent", "agent-handled", "agent_handled"].includes(reason)) {
        effects.push({
          kind: "toast",
          variant: "info",
          message: `${event.data.customer?.firstName ?? ""}'s ${event.data.channel.channelType.name}${channelSessionEndedReason(event, ctx.t)}`,
        });
      }
      effects.push({ kind: "channelSessionEnded", conversationId: conversation.conversationId });
      break;
    }
    case "conversation_data_changed":
      conversation.activeConversationData = event.data;
      pushSystem(conversation, event, ctx);
      effects.push({ kind: "conversationData", payload: event });
      break;
    case "associated_customer_changed":
      conversation.customer = event.data;
      break;
    case "agent_subscribed":
      if (
        event.data.agentParticipant.participant.keycloakUser.id !==
        conversation.topicParticipant.participant.keycloakUser.id
      ) {
        conversation.agentParticipants.push(event.data.agentParticipant);
      }
      pushSystem(conversation, event, ctx);
      break;
    case "agent_unsubscribed":
      conversation.agentParticipants = conversation.agentParticipants.filter(
        (p) => p.participant.keycloakUser.id !== event.data.agentParticipant.participant.keycloakUser.id,
      );
      effects.push({ kind: "whisperCheck" });
      pushSystem(conversation, event, ctx);
      break;
    case "task_enqueued":
    case "no_agent_available":
      pushSystem(conversation, event, ctx);
      break;
    case "task_state_changed":
      pushSystem(conversation, event, ctx);
      if (event.data?.task?.state?.name === "WRAP_UP") effects.push({ kind: "crm", payload: event });
      break;
    case "message_delivery_notification":
      applyDelivery(conversation, event);
      break;
    case "typing_indicator":
      if (lower(event.data?.header?.sender?.type) === "connector") conversation.typingUntil = now + TYPING_MS;
      break;
    case "participant_role_changed": {
      const participant = event.data.conversationParticipant;
      if (participant.participant.keycloakUser.id === ctx.agentId)
        conversation.topicParticipant = participant;
      else
        conversation.agentParticipants = conversation.agentParticipants.map((p) =>
          p.participant.id === participant.participant.id ? participant : p,
        );
      effects.push({ kind: "whisperCheck" });
      pushSystem(conversation, event, ctx);
      if (participant.role === "WHISPER" || participant.role === "PRIMARY") {
        effects.push({ kind: "crm", payload: { ...event, action: "participantRoleChanged" } });
      }
      break;
    }
    case "agent_sla_started": {
      const action = lower(event.data.action);
      if (action === "start_timer") {
        conversation.sla = {
          totalDuration: event.data.totalDuration,
          deadline: now + event.data.totalDuration * 1000,
          color: "sla-normal",
          popup: false,
        };
      } else if (action === "show_popup") {
        conversation.sla.color = "sla-ended";
        conversation.sla.popup = true;
      } else if (action === "change_color") conversation.sla.color = "sla-warn";
      else if (action === "change_color_to_red") conversation.sla.color = "sla-red";
      break;
    }
    case "agent_sla_stopped":
      stopSla(conversation);
      break;
    case "agent_sla_expired":
      if (conversation.handRaised)
        effects.push({ kind: "emitHandRaise", conversationId: conversation.conversationId });
      break;
    case "conversation_paused": {
      const left = remainingSeconds(
        event.data?.holdTimerDetails?.startTime,
        event.data?.holdTimerDetails?.totalDuration,
        now,
      );
      if (left > 0 || left === -100) {
        conversation.hold = { active: true, deadline: left > 0 ? now + left * 1000 : null };
        effects.push({
          kind: "toast",
          variant: "success",
          message: ctx.t("workspace.conversation-paused", { name: conversation.customer.firstName ?? "" }),
        });
      }
      break;
    }
    case "conversation_resumed":
      conversation.hold = { active: false, deadline: null };
      effects.push({
        kind: "toast",
        variant: "success",
        message: ctx.t("workspace.conversation-resumed", { name: conversation.customer.firstName ?? "" }),
      });
      break;
    case "hand_raised":
      if (event.data?.userName === ctx.agentUsername) {
        conversation.handRaised = true;
        effects.push({
          kind: "toast",
          variant: "success",
          message: ctx.t("snackbar.hand-raised-notification"),
        });
      }
      break;
    case "hand_down":
      if (!event.data || event.data.userName === ctx.agentUsername) conversation.handRaised = false;
      break;
    case "external_gadget_requested": {
      const action = lower(event.data?.action);
      for (const gadget of event.data?.gadgets ?? []) {
        if (gadget.agentId != null && gadget.agentId !== ctx.agentId) continue;
        if (action === "open") {
          const i = conversation.embeddedApps.findIndex((a) => a.id === gadget.id);
          if (i < 0) conversation.embeddedApps.push(gadget);
          else if (conversation.embeddedApps[i]!.value !== gadget.value)
            conversation.embeddedApps[i] = gadget;
        } else if (action === "close") {
          conversation.embeddedApps = conversation.embeddedApps.filter((a) => a.id !== gadget.id);
        }
      }
      effects.push({ kind: "externalGadget", conversationId: conversation.conversationId, data: event.data });
      break;
    }
    default:
      if (lower(event.type) === "activity") applyDelivery(conversation, event);
  }
  return effects;
}

/** handleDeliveryNotification: seen avatars, read receipts and failed sends. */
export function applyDelivery(conversation: Conversation, event: CimEvent) {
  const sender = event.data?.header?.sender;
  const status = lower(event.data?.body?.status);
  const senderType = lower(sender?.type);
  const me = conversation.topicParticipant.participant.keycloakUser.id;
  if (sender?.id !== me && status === "read" && (senderType === "connector" || senderType === "agent")) {
    let reader = sender;
    if (senderType === "connector") {
      const c = event.data.header.customer ?? conversation.customer;
      reader = {
        id: c._id,
        type: "CUSTOMER",
        senderName: [c.firstName, c.lastName].filter(Boolean).join(" "),
      };
    }
    addSeenBy(conversation, reader);
  }
  if (senderType === "customer" && status === "read")
    markSeenUntil(conversation.messages, event.data.body.messageId);
  else if (senderType === "system" && status === "failed") {
    const message = conversation.messages.find((m) => m.id === event.data.body.messageId);
    if (message) message.header.status = "failed";
  }
}
