import { selectedSession } from "../model/outgoing";
import type { ChannelSession, Conversation } from "../model/types";

/** Prefer checked session, then topic first session, then any active session. */
export function linkingChannelSession(conversation: Conversation): ChannelSession | null {
  return (
    selectedSession(conversation) ??
    conversation.firstChannelSession ??
    conversation.activeChannelSessions[0] ??
    null
  );
}

export function isFakeConversation(conversation: Conversation) {
  return conversation.roomInfo === "FAKE_CONVERSATION";
}
