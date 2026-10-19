import { can, getSession } from "@/core/auth";
import { socketManager } from "@/core/realtime";
import { newAgentMessage, toCimEvent } from "../model/outgoing";
import type { CimMessage, Conversation } from "../model/types";
import { useConversationStore } from "../store/conversationStore";
import { publishCimEvent } from "./commands";

const seen = new Map<string, string>();
export const resetSeenMessages = () => seen.clear();
export function mayMarkSeen(
  conversation: Conversation,
  message: CimMessage,
  context: { focused: boolean; visible: boolean; atBottom: boolean },
) {
  return (
    context.focused &&
    context.visible &&
    context.atBottom &&
    conversation.state === "ACTIVE" &&
    conversation.roomInfo !== "FAKE_CONVERSATION" &&
    !["SILENT_MONITOR", "ASSISTANT"].includes(conversation.topicParticipant.role) &&
    ["customer", "agent"].includes(message.header.sender?.type?.toLowerCase() ?? "") &&
    message.header.sender?.id !== conversation.topicParticipant.participant.keycloakUser.id
  );
}
/** Called only by a focused, visible transcript at the bottom. Shared across main/pop-out views. */
export function publishSeen(
  conversation: Conversation,
  message: CimMessage,
  context: { focused: boolean; visible: boolean; atBottom: boolean },
) {
  const owner = getSession().user?.id;
  if (
    !owner ||
    owner !== conversation.topicParticipant.participant.keycloakUser.id ||
    !can("conversations") ||
    !socketManager.connected ||
    !mayMarkSeen(conversation, message, context)
  )
    return;
  const key = `${owner}:${conversation.conversationId}`;
  if (seen.get(key) === message.id) return;
  const notification = newAgentMessage(conversation);
  notification.header.channelData = message.header.channelData;
  notification.header.channelSession = message.header.channelSession;
  notification.body = {
    type: "DELIVERYNOTIFICATION",
    markdownText: "",
    messageId: message.id,
    status: "READ",
    reasonCode: 200,
  };
  const { cimEvent } = toCimEvent("MESSAGE_DELIVERY_NOTIFICATION", conversation, notification, {
    keepLocal: false,
  });
  publishCimEvent(conversation, cimEvent);
  seen.set(key, message.id);
  useConversationStore.getState().markRead(conversation.conversationId);
}
