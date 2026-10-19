import { can, getSession, useSessionStore } from "@/core/auth";
import { useConversationStore } from "../store/conversationStore";
import type { ChannelSession, Conversation } from "../model/types";

export interface OutboundTarget {
  owner: string;
  channel: "EMAIL" | "WHATSAPP";
  destination: string;
  from: string;
  customerId?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}
export function outboundSession(
  conversation: Conversation,
  target: OutboundTarget,
): ChannelSession | undefined {
  if (
    conversation.state !== "ACTIVE" ||
    conversation.roomInfo === "FAKE_CONVERSATION" ||
    conversation.topicParticipant.role !== "PRIMARY" ||
    conversation.topicParticipant.participant.keycloakUser.id !== target.owner ||
    (target.customerId && conversation.customer._id !== target.customerId)
  )
    return;
  return conversation.activeChannelSessions.find(
    (session) =>
      !session.isDisabled &&
      session.channel.channelType.name.toUpperCase() === target.channel &&
      (session.channel.serviceIdentifier ?? session.channelData.serviceIdentifier) === target.from &&
      session.channelData.channelCustomerIdentifier?.toLowerCase() === target.destination.toLowerCase(),
  );
}

/** Waits only for the initiating agent's exact destination/From session; always removes listeners. */
export function waitForOutboundSession(
  target: OutboundTarget,
): Promise<{ conversation: Conversation; session: ChannelSession }> {
  return new Promise((resolve, reject) => {
    let completed = false;
    let unlistenTopics = () => {};
    let unlistenAuth = () => {};
    const cleanup = () => {
      clearTimeout(timer);
      unlistenTopics();
      unlistenAuth();
      target.signal?.removeEventListener("abort", abort);
    };
    const fail = (message: string) => {
      if (completed) return;
      completed = true;
      cleanup();
      reject(new Error(message));
    };
    const abort = () => fail("Outbound send was cancelled.");
    const timer = setTimeout(
      () => fail("The outbound conversation did not become active. Your message has not been sent."),
      target.timeoutMs ?? 30_000,
    );
    const check = () => {
      if (completed) return;
      if (getSession().user?.id !== target.owner || !can("agentSession")) {
        fail("Your agent session changed. Your message has not been sent.");
        return;
      }
      for (const conversation of Object.values(useConversationStore.getState().byId)) {
        const session = outboundSession(conversation, target);
        if (session) {
          completed = true;
          cleanup();
          resolve({ conversation, session });
          return;
        }
      }
    };
    unlistenTopics = useConversationStore.subscribe(check);
    unlistenAuth = useSessionStore.subscribe(check);
    target.signal?.addEventListener("abort", abort, { once: true });
    if (target.signal?.aborted) abort();
    else check();
  });
}
