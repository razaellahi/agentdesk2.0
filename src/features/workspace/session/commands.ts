import { socketManager } from "@/core/realtime";
import { getSession } from "@/core/auth";
import type { ChannelSession, Conversation, KeycloakUserRef, TopicParticipant } from "../model/types";

function me(): KeycloakUserRef {
  const user = getSession().user;
  if (!user) throw new Error("No agent session");
  return user as unknown as KeycloakUserRef;
}

const uuid = () => crypto.randomUUID();

/** Same shape as unified-agent's TopicParticipant class. */
export function topicParticipant(
  conversationId: string,
  role: string,
  state = "SUBSCRIBED",
): TopicParticipant {
  const agent = me();
  return {
    id: uuid(),
    type: "AGENT",
    participant: {
      id: agent.id,
      participantType: "CCUser",
      keycloakUser: agent,
      associatedRoutingAttributes: [],
    },
    token: null,
    conversationId,
    role,
    userCredentials: null,
    state,
  };
}

export function subscribeTopic(conversationId: string, roomInfo: unknown, taskId: string, role = "PRIMARY") {
  socketManager.emit("topicSubscription", {
    topicParticipant: topicParticipant(conversationId, role),
    agentId: me().id,
    conversationId,
    roomInfo,
    taskId,
  });
}

/** Leaves an ACTIVE conversation via agent-manager (topicUnsub). Closed ones are just dropped locally. */
export function unsubscribeTopic(conversation: Pick<Conversation, "conversationId" | "roomInfo">) {
  socketManager.emit("topicUnsubscription", {
    roomInfo: conversation.roomInfo,
    conversationId: conversation.conversationId,
    agentId: me().id,
  });
}

export function joinPullModeRequest(
  channelSession: ChannelSession,
  role: "PRIMARY" | "WHISPER",
  requestId?: string,
) {
  socketManager.emit("joinPullModeRequest", {
    topicParticipant: topicParticipant(String(channelSession.conversationId), role),
    agentId: me().id,
    channelSession,
    ...(requestId ? { requestId } : {}),
  });
}

export function changeAgentState(state: {
  name: "READY" | "NOT_READY" | "LOGOUT";
  reasonCode: unknown;
  flag?: string;
}) {
  socketManager.emit("changeAgentState", { agentId: me().id, action: "agentState", state });
}

export function changeMrdState(mrdId: string, state: "READY" | "NOT_READY") {
  socketManager.emit("changeAgentState", { agentId: me().id, action: "agentMRDState", state, mrdId });
}

export function publishCimEvent(
  conversation: Pick<Conversation, "conversationId" | "roomInfo">,
  cimEvent: unknown,
) {
  socketManager.emit("publishCimEvent", {
    cimEvent,
    agentId: me().id,
    conversationId: conversation.conversationId,
    roomInfo: conversation.roomInfo,
  });
}
