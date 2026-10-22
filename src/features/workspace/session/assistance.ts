import { can } from "@/core/auth";
import { getConversation } from "../store/conversationStore";
import { routingEngineApi } from "@/core/api";
import { socketManager } from "@/core/realtime";
import { postCrmEvent } from "@/core/crm-bridge";
import { cxVoiceSessionOf, isCiscoSession, type VoiceStacks } from "../model/participants";
import { lower } from "../model/systemMessages";
import type { AgentParticipant, Conversation } from "../model/types";

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

/** The agent's call as assistance sees it (the voice feature's call legs). */
export interface LiveCall {
  /** Dialog ids of the live legs, customer leg first. */
  dialogIds: string[];
  conference: boolean;
  /** A consult leg is open beside the customer leg. */
  consulting: boolean;
  /** The live call came in over WebRTC. */
  webRtc: boolean;
}

export type AssistanceBlock =
  "role" | "no-call" | "cisco" | "web-rtc" | "conference" | "consulting" | "web-conference";

/** Why the agent cannot ask for assistance right now (unified-agent's agent-assistance button), or null. */
export function assistanceBlock(
  conversation: Conversation,
  call: LiveCall,
  stacks: VoiceStacks,
): AssistanceBlock | null {
  if (conversation.topicParticipant.role !== "PRIMARY") return "role";
  const sessions = conversation.activeChannelSessions;
  const cx = Boolean(cxVoiceSessionOf(conversation, stacks));
  // A CX Voice conversation is handed over with its call; without one there is nothing to hand over.
  if (cx && call.dialogIds.length === 0) return "no-call";
  if (sessions.some((s) => isCiscoSession(s, stacks))) return "cisco";
  if (call.webRtc && sessions.some((s) => lower(s.channel?.channelType?.name) === "web_rtc"))
    return "web-rtc";
  if (cx && call.conference) return "conference";
  if (cx && call.consulting) return "consulting";
  if (!cx && conversation.webConference) return "web-conference";
  return null;
}

const TASK_TYPE: Record<AssistAction, string> = {
  transfer: "DirectTransfer",
  consult: "Consult",
  conference: "DirectConference",
};

/** Direct transfer, consult, or queue conference (unified-agent sendAgentRequest / sendQueueRequest). */
export function requestAssistance(
  conversation: Conversation,
  action: AssistAction,
  target: { mode: "agent" | "queue"; agentId?: string; queueName?: string },
  note: string,
  call: LiveCall,
  stacks: VoiceStacks,
) {
  const latest = getConversation(conversation.conversationId);
  if (!latest || latest.state !== "ACTIVE" || !socketManager.connected) return false;
  if (assistanceBlock(latest, call, stacks)) return false;
  if (!can(action === "transfer" ? "directTransfer" : action)) return false;
  if (target.mode === "agent" ? !target.agentId : !target.queueName) return false;
  // On a CX Voice call the request carries the call's session; the named agent is then
  // dialled over SIP (agentAssignedForAssistance), so the server does not offer it to them.
  const voice = cxVoiceSessionOf(latest, stacks);
  const onCall = Boolean(voice) && call.dialogIds.length > 0;
  const data = {
    channelSession: target.mode === "agent" && onCall ? voice : latest.firstChannelSession,
    agentParticipant: latest.topicParticipant,
    mode: target.mode,
    note,
    ...(target.mode === "agent"
      ? { requestedAgentId: target.agentId ?? null, offerToAgent: !onCall }
      : { queueName: target.queueName }),
  };
  const event =
    action === "transfer"
      ? "directTransferRequest"
      : action === "conference"
        ? "directConferenceRequest"
        : "consultRequest";
  socketManager.emit(event, data);
  postCrmEvent({ ...data, taskType: TASK_TYPE[action] });
  return true;
}

/** Completes an accepted chat consult as a transfer to, or a conference with, the consulted agent. */
export function completeConsult(
  conversation: Conversation,
  action: "transfer" | "conference",
  agent: AgentParticipant,
) {
  const latest = getConversation(conversation.conversationId);
  if (
    !latest ||
    latest.state !== "ACTIVE" ||
    !socketManager.connected ||
    latest.topicParticipant.role !== "PRIMARY"
  )
    return false;
  if (!can(action === "transfer" ? "directTransfer" : "conference")) return false;
  const consulted = latest.agentParticipants.find(
    (p) => p.participant.id === agent.participant.id && p.role === "ASSISTANT",
  );
  if (!consulted) return false;
  socketManager.emit(action === "transfer" ? "consultTransferRequest" : "consultConferenceRequest", {
    conversationId: latest.conversationId,
    channelSession: latest.firstChannelSession,
    agentParticipant: latest.topicParticipant,
    requestedAgentId: consulted.participant.id,
    mode: "agent",
    offerToAgent: false,
  });
  return true;
}
