import { useMemo } from "react";
import { useCurrentUser } from "@/core/auth";
import type { CaseConversationContext } from "@/features/cases";
import type { Conversation } from "../model/types";
import { text } from "./useCustomerContext";

/** What the Cases tab needs from the conversation (was the AGENTDESK_AUTH postMessage payload). */
export function useCaseConversationContext(conversation: Conversation): CaseConversationContext {
  const user = useCurrentUser();
  const { customer } = conversation;
  const session = conversation.activeChannelSessions[0] ?? conversation.firstChannelSession;
  return useMemo(() => {
    const name = [text(customer.firstName), text(customer.lastName)].filter(Boolean).join(" ");
    const agent = [user?.firstName, user?.lastName].filter((part) => part?.trim()).join(" ");
    return {
      interactionId: conversation.conversationId,
      customerProfileId: customer._id || null,
      customerName: name || text(customer.email) || text(customer.msisdn) || text(customer.phone) || null,
      channel: session?.channel?.channelType?.name?.trim() || session?.channel?.name?.trim() || null,
      agentName: agent || user?.username || null,
    };
  }, [conversation.conversationId, customer, session, user]);
}
