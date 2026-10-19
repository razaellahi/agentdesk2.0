import { can } from "@/core/auth";
import { getConversation } from "../store/conversationStore";
import { routingEngineApi } from "@/core/api";
import { socketManager } from "@/core/realtime";
import type { Conversation } from "../model/types";

export interface AssistTarget {
  id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  queueId?: string;
  queueName?: string;
}

export async function searchAssistance(
  type: "AGENT" | "QUEUE",
  search: string,
  conversationId: string,
  agentId: string,
) {
  const body = await routingEngineApi.get<{ docs?: AssistTarget[] }>(
    "/precision-queues/available-agents-and-queues",
    { searchParams: { type, search, conversationId, agentId, pageTo: 0, pageSize: 20 } },
  );
  return body.docs ?? [];
}

export type AssistAction = "transfer" | "consult" | "conference";

/** Direct transfer, consult, or queue conference (unified-agent sendAgentRequest / sendQueueRequest). */
export function requestAssistance(
  conversation: Conversation,
  action: AssistAction,
  target: { mode: "agent" | "queue"; agentId?: string; queueName?: string },
  note: string,
) {
  const latest = getConversation(conversation.conversationId);
  if (
    !latest ||
    latest.state !== "ACTIVE" ||
    !socketManager.connected ||
    latest.topicParticipant.role !== "PRIMARY"
  )
    return false;
  if (!can(action === "transfer" ? "directTransfer" : action)) return false;
  if (target.mode === "agent" ? !target.agentId : !target.queueName) return false;
  conversation = latest;
  const event =
    action === "transfer"
      ? "directTransferRequest"
      : action === "conference"
        ? "directConferenceRequest"
        : "consultRequest";
  socketManager.emit(event, {
    channelSession: conversation.firstChannelSession,
    agentParticipant: conversation.topicParticipant,
    mode: target.mode,
    note,
    ...(target.mode === "agent"
      ? { requestedAgentId: target.agentId ?? null, offerToAgent: true }
      : { queueName: target.queueName }),
  });
  return true;
}

/** Completes an accepted consult as a transfer or a conference (chat, not CX Voice). */
export function completeConsult(conversation: Conversation, action: "transfer" | "conference") {
  const latest = getConversation(conversation.conversationId);
  if (
    !latest ||
    latest.state !== "ACTIVE" ||
    !socketManager.connected ||
    latest.topicParticipant.role !== "PRIMARY"
  )
    return false;
  if (!can(action === "transfer" ? "directTransfer" : "conference")) return false;
  conversation = latest;
  const selfId = conversation.topicParticipant.participant.id;
  const other = conversation.agentParticipants.find(
    (agent) => agent.participant.id !== selfId && agent.role === "ASSISTANT",
  );
  if (!other) return false;
  socketManager.emit(action === "transfer" ? "consultTransferRequest" : "consultConferenceRequest", {
    conversationId: conversation.conversationId,
    channelSession: conversation.firstChannelSession,
    agentParticipant: conversation.topicParticipant,
    requestedAgentId: other?.participant.id ?? null,
    mode: "agent",
    offerToAgent: false,
  });
}
