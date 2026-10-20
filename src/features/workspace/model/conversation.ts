import { lower, systemMessageFor, type Translate } from "./systemMessages";
import { suggestionText } from "./suggestions";
import type {
  AgentParticipant,
  ChannelSession,
  CimEvent,
  CimMessage,
  Conversation,
  ConversationContextEntry,
  EmbeddedApp,
  Sender,
  TopicParticipant,
} from "./types";

export interface ModelContext {
  agentId: string;
  agentUsername: string;
  t: Translate;
  now: number;
  /** Channel types from onChannelTypes (needed for outbound SMS history items). */
  channelTypes?: { name: string }[];
}

const VOICE_TYPES = ["cisco_cc", "cx_voice", "web_rtc"];
export const isVoiceSession = (s: ChannelSession) =>
  VOICE_TYPES.includes(lower(s.channel?.channelType?.name));
export const hasNonVoiceSession = (sessions: ChannelSession[]) => sessions.some((s) => !isVoiceSession(s));

export function messageRole(eventName: string): ConversationContextEntry["role"] {
  switch (lower(eventName)) {
    case "agent_message":
      return "agent";
    case "customer_message":
      return "customer";
    case "bot_message":
      return "bot";
    case "whisper_message":
      return "whisper";
    default:
      return "system";
  }
}

/** Seconds left on a server timer (calculateDateDifferenceInSeconds); -100 = paused without end. */
export function remainingSeconds(
  startTime: string | number | null | undefined,
  totalDuration: number | null | undefined,
  now: number,
) {
  if (!startTime || !totalDuration) return -100;
  // Backend timestamps are "yyyy-MM-dd HH:mm:ss" in UTC without a zone marker.
  const start =
    typeof startTime === "string" && !/[zZ]|[+-]\d\d:?\d\d$/.test(startTime)
      ? Date.parse(`${startTime.replace(" ", "T")}Z`)
      : new Date(startTime).getTime();
  const elapsed = Math.abs(now - start) / 1000;
  return Math.round(totalDuration - elapsed);
}

/** Like / hide / delete actions on social comments mutate the original comment. */
export function applyCommentAction(messages: CimMessage[], action: CimMessage) {
  const item = lower(action.body.itemType);
  if (!["like", "hide", "delete"].includes(item)) return;
  const target = messages.find((m) => m.id === action.header.originalMessageId);
  if (!target) return;
  if (item === "like") target.isLiked = true;
  else if (item === "hide")
    target.isHidden = Boolean((action.header.additionalData as { isHidden?: boolean } | undefined)?.isHidden);
  else target.isDeleted = true;
}

export function mergeBotSuggestions(
  conversation: Pick<Conversation, "messages">,
  data: { requestedMessage?: { id?: string }; suggestions?: { confidenceLevel: number }[] },
) {
  const id = data?.requestedMessage?.id;
  if (!id) return false;
  const target = [...conversation.messages]
    .reverse()
    .find((m) => lower(m.header.sender?.type) === "customer" && m.id === id);
  if (!target) return false;
  target.botSuggestions = (data.suggestions ?? []).map((s) => ({
    ...s,
    text: suggestionText(s),
    confidenceLevel: s.confidenceLevel * 100,
  }));
  target.showBotSuggestions = false;
  return true;
}

/** Agent/bot messages up to `id` become "seen" (failed ones stay failed). */
export function markSeenUntil(messages: CimMessage[], id: string) {
  const index = messages.findIndex((m) => m.id === id);
  messages.forEach((m, i) => {
    const type = lower(m.header.sender?.type);
    if (i <= index && (type === "agent" || type === "bot") && m.header.status !== "failed")
      m.header.status = "seen";
  });
}

/** Moves a reader's avatar to the agent's latest message (addParticipantsToLastSeenMessage). */
export function addSeenBy(conversation: Pick<Conversation, "messages" | "topicParticipant">, sender: Sender) {
  const me = conversation.topicParticipant.participant.keycloakUser.id;
  const messages = conversation.messages;
  let index = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (
      m.header?.status !== "failed" &&
      m.header.sender?.id === me &&
      (!m.body.isWhisper || lower(sender.type) !== "customer")
    ) {
      index = i;
      break;
    }
  }
  if (index < 0) return;
  const target = messages[index]!;
  target.header.seenStatuses ??= [];
  if (target.header.seenStatuses.some((s) => s.id === sender.id)) return;
  target.header.seenStatuses.push(sender);
  for (let k = index - 1; k >= 0; k--) {
    const prev = messages[k]!;
    if (prev.header.sender?.id === me && prev.header.seenStatuses) {
      prev.header.seenStatuses = prev.header.seenStatuses.filter((s) => s.id !== sender.id);
    }
  }
}

function normaliseConnectorSender(data: CimMessage, customer: { _id: string; firstName?: string }) {
  if (lower(data.header?.sender?.type) === "connector") {
    data.header.sender = {
      ...data.header.sender,
      senderName: customer.firstName,
      id: customer._id,
      type: "CUSTOMER",
    };
  }
}

function scheduledStatus(events: CimEvent[], messageId: string): string | null {
  const status = events.find(
    (e) =>
      lower(e.name) === "third_party_activity" &&
      lower(e.data?.body?.type) === "deliverynotification" &&
      e.data.body.messageId === messageId,
  );
  return status ? status.data.body.status : null;
}

/** Seen avatars from history (addParticipantsToTheLastSeenMessage). */
function seenFromHistory(conversation: Conversation, events: CimEvent[]) {
  const me = conversation.topicParticipant.participant.keycloakUser.id;
  const added = new Set<string>();
  for (let i = events.length - 1; i > 0; i--) {
    const e = events[i]!;
    if (lower(e.name) !== "message_delivery_notification" || lower(e.data?.body?.status) !== "read") continue;
    const reader = e.data.header?.sender as Sender | undefined;
    if (!reader?.id || reader.id === me) continue;
    for (let j = i - 1; j >= 0; j--) {
      const prev = events[j]!;
      const pn = lower(prev.name);
      if (pn === "hand_down" || pn === "hand_raised") continue;
      const isMine = prev.data?.header?.sender?.id === me;
      const isAgentMsg =
        pn === "agent_message" || (pn === "whisper_message" && lower(reader.type) === "agent");
      if (isMine && isAgentMsg && !added.has(reader.id)) {
        prev.data.header.seenStatuses = [...(prev.data.header.seenStatuses ?? []), reader];
        added.add(reader.id);
      }
    }
  }
}

export interface TopicDataPayload {
  topicData: {
    customer: Conversation["customer"];
    conversationData?: unknown;
    channelSession?: ChannelSession & { customerSuggestions?: unknown[] };
    topicParticipant: TopicParticipant;
    topicEvents?: CimEvent[];
    participants?: { type: string; role?: string; participant: Record<string, unknown> }[];
    externalGadgets?: EmbeddedApp[];
    agentHandRaise?: { handRaised?: boolean; agentNames?: string[] };
    agentSla?: { action?: string; totalDuration?: number; startTime?: string };
    holdTimerDetails?: { startTime?: string; totalDuration?: number };
    state?: string;
  };
  conversationId: string;
  roomInfo: unknown;
  taskId: string;
}

/** Builds a Conversation from onTopicData (subscribe or reload). Port of socketService.onTopicData. */
export function buildConversation(payload: TopicDataPayload, ctx: ModelContext, seq: number): Conversation {
  const { topicData, conversationId, roomInfo, taskId } = payload;
  const customer = topicData.customer;
  const events = topicData.topicEvents ?? [];

  const conversation: Conversation = {
    conversationId,
    roomInfo,
    taskId,
    state: roomInfo === "FAKE_CONVERSATION" ? "CLOSED" : "ACTIVE",
    seq,
    customer,
    customerSuggestions: topicData.channelSession?.customerSuggestions ?? [],
    topicParticipant: topicData.topicParticipant,
    firstChannelSession: topicData.channelSession ?? null,
    activeChannelSessions: [],
    agentParticipants: [],
    messages: [],
    embeddedApps: [],
    activeConversationData: topicData.conversationData,
    unread: 0,
    typingUntil: null,
    composerEnabled: false,
    handRaised: false,
    appliedWrapUps: [],
    aiContext: [],
    sla: { totalDuration: 0, deadline: null, color: "sla-normal", popup: false },
    wrapUp: { show: false, deadline: null },
    hold: { active: false, deadline: null },
    waitingSince: null,
    lastMessageAt: ctx.now,
  };

  // External gadgets for everyone or this agent, de-duplicated by URL.
  const gadgets = new Map<unknown, EmbeddedApp>();
  for (const g of topicData.externalGadgets ?? [])
    if (g.agentId == null || g.agentId === ctx.agentId) gadgets.set(g.value, g);
  conversation.embeddedApps = [...gadgets.values()];

  const failed = new Set<string>();
  for (const event of events) {
    const name = lower(event.name);
    if (name === "hand_down" || name === "hand_raised") continue;
    if (event.channelSession && event.data?.header) event.data.header.channelSession = event.channelSession;
    if (event.data?.header) normaliseConnectorSender(event.data, customer);
    if (name === "message_delivery_notification" && lower(event.data?.body?.status) === "failed")
      failed.add(event.data.body.messageId);

    if (["agent_message", "bot_message", "customer_message"].includes(name)) {
      const bodyType = lower(event.data.body.type);
      const itemType = lower(event.data.body.itemType);
      if (
        (bodyType === "plain" || (bodyType === "comment" && itemType === "text")) &&
        name !== "bot_message"
      ) {
        conversation.aiContext.push({ role: messageRole(event.name), text: event.data.body.markdownText });
      }
      if (bodyType === "wrapup" && event.data.header?.sender?.id === ctx.agentId) {
        conversation.appliedWrapUps.push(...(event.data.body.wrapups ?? []));
      }
      if (
        name === "agent_message" &&
        bodyType === "comment" &&
        !["text", "video", "image", "private_reply"].includes(itemType)
      ) {
        applyCommentAction(conversation.messages, event.data);
      } else if (name === "agent_message" && lower(event.data.header.intent) === "update") {
        const original = conversation.messages.find((m) => m.id === event.data.header.originalMessageId);
        if (original) {
          original.body.markdownText = event.data.body.markdownText;
          original.isEdited = true;
        }
      } else {
        event.data.header.status = "sent";
        conversation.messages.push(event.data);
      }
    } else if (name === "third_party_activity") {
      const attrs = event.data.header?.channelData?.additionalAttributes ?? [];
      const outbound = attrs.find(
        (a: { type?: string; value?: unknown }) =>
          lower(a.type) !== "webchanneldata" && lower(a.value) === "outbound",
      );
      if (outbound) {
        event.data.body.type = "outboundsms";
        const sms = ctx.channelTypes?.find((c) => lower(c.name) === "sms");
        if (sms && event.data.header.channelSession?.channel)
          event.data.header.channelSession.channel.channelType = sms;
        conversation.messages.push(event.data);
      }
      if (event.data.header?.schedulingMetaData && lower(event.data.body.type) === "plain") {
        event.data.header.channelSession = {
          channel: { channelType: event.data.header.schedulingMetaData.channelType },
          channelData: event.data.header.channelData,
        };
        const status = scheduledStatus(events, event.data.id);
        if (status) event.data.header.scheduledStatus = status;
        conversation.messages.push(event.data);
      }
    } else if (
      [
        "task_enqueued",
        "no_agent_available",
        "channel_session_started",
        "channel_session_ended",
        "agent_subscribed",
        "agent_unsubscribed",
        "task_state_changed",
        "participant_role_changed",
        "call_leg_ended",
        "voice_activity",
        "voice_mail_activity",
        "conversation_data_changed",
      ].includes(name)
    ) {
      const message = systemMessageFor(event, ctx);
      if (message) conversation.messages.push(message);
    } else if (name === "whisper_message") {
      event.data.header.status = "sent";
      event.data.body.isWhisper = true;
      conversation.messages.push(event.data);
    } else if (name === "bot_suggestion") {
      mergeBotSuggestions(conversation, event.data);
    }
  }

  // Seen / failed status from history.
  const lastCustomerRead = [...events]
    .reverse()
    .find(
      (e) =>
        lower(e.name) === "message_delivery_notification" &&
        lower(e.data?.header?.sender?.type) === "customer",
    );
  if (lastCustomerRead && lower(lastCustomerRead.data.body.status) === "read")
    markSeenUntil(conversation.messages, lastCustomerRead.data.body.messageId);
  seenFromHistory(conversation, events);
  for (const m of conversation.messages) if (failed.has(m.id)) m.header.status = "failed";

  // Participants: customer channel sessions + other agents.
  for (const part of topicData.participants ?? []) {
    const type = lower(part.type);
    if (type === "customer") {
      const session = part.participant as unknown as ChannelSession;
      const web = session.channelData?.additionalAttributes?.find((a) => lower(a?.type) === "webchanneldata");
      if (web) session.webChannelData = web.value;
      conversation.activeChannelSessions.push(session);
      if (
        topicData.agentHandRaise?.handRaised &&
        topicData.agentHandRaise.agentNames?.includes(ctx.agentUsername)
      ) {
        conversation.handRaised = true;
      }
    } else if (type === "agent") {
      const agent = part as unknown as AgentParticipant;
      if (agent.participant.keycloakUser.id !== conversation.topicParticipant.participant.keycloakUser.id) {
        conversation.agentParticipants.push(agent);
      }
    }
  }
  conversation.activeChannelSessions.forEach((s) => {
    s.isDisabled = isVoiceSession(s);
    s.isChecked = false;
  });
  const reply = conversation.activeChannelSessions.find((s) => !isVoiceSession(s));
  if (reply) reply.isChecked = true;
  conversation.composerEnabled = hasNonVoiceSession(conversation.activeChannelSessions);

  // Hold timer recovery.
  if (topicData.holdTimerDetails?.startTime || lower(topicData.state) === "on_hold") {
    const left = remainingSeconds(
      topicData.holdTimerDetails?.startTime,
      topicData.holdTimerDetails?.totalDuration,
      ctx.now,
    );
    if (left > 0) conversation.hold = { active: true, deadline: ctx.now + left * 1000 };
    else if (left === -100) conversation.hold = { active: true, deadline: null };
  }

  // Agent SLA recovery.
  const sla = topicData.agentSla;
  if (sla?.totalDuration) conversation.sla.totalDuration = sla.totalDuration;
  if (sla?.action) {
    const action = lower(sla.action);
    if (action === "change_color") conversation.sla.color = "sla-warn";
    else if (action === "change_color_to_red") conversation.sla.color = "sla-red";
    else if (action === "show_popup" || action === "remove_all_agents") {
      conversation.sla.color = "sla-ended";
      conversation.sla.popup = true;
    }
    const left = remainingSeconds(sla.startTime, sla.totalDuration, ctx.now);
    conversation.sla.deadline = left > 0 ? ctx.now + left * 1000 : null;
  }

  conversation.waitingSince = computeWaitingSince(conversation.messages);
  const last = conversation.messages[conversation.messages.length - 1];
  conversation.lastMessageAt = Number(last?.header.timestamp) || ctx.now;
  return conversation;
}

/**
 * Oldest customer message after the agent's last reply: drives the "customer
 * waiting" timer on the board.
 */
export function computeWaitingSince(messages: CimMessage[]): number | null {
  let since: number | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    const type = lower(m.header.sender?.type);
    if (type === "agent" && !m.body.isWhisper && lower(m.body.type) !== "wrapup") break;
    if (type === "customer") since = Number(m.header.timestamp) || since;
  }
  return since;
}
