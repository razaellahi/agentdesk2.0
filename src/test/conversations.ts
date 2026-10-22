import type { ChannelSession, Conversation } from "@/features/workspace";

export function conversationFixture(id = "conversation-a", name = "Amina"): Conversation {
  const channel: ChannelSession = {
    id: `${id}-web`,
    channel: { id: "web", channelType: { name: "WEB" } },
    channelData: { channelCustomerIdentifier: `${name}@example.com`, serviceIdentifier: "support" },
    isChecked: true,
    isDisabled: false,
  };
  return {
    conversationId: id,
    roomInfo: { id: `room-${id}` },
    taskId: `task-${id}`,
    state: "ACTIVE",
    seq: 1,
    customer: { _id: `customer-${id}`, firstName: name },
    customerSuggestions: [],
    topicParticipant: {
      id: `participant-${id}`,
      type: "AGENT",
      participant: {
        id: "agent-id",
        participantType: "CCUser",
        keycloakUser: { id: "agent-id", username: "agent" },
      },
      token: null,
      conversationId: id,
      role: "PRIMARY",
      userCredentials: null,
      state: "SUBSCRIBED",
    },
    firstChannelSession: channel,
    activeChannelSessions: [channel],
    agentParticipants: [],
    webConference: false,
    embeddedApps: [],
    activeConversationData: null,
    messages: [
      {
        id: `message-${id}`,
        header: { timestamp: Date.now(), sender: { type: "CUSTOMER", senderName: name } },
        body: { type: "PLAIN", markdownText: `Hello, I need help with ${id}.` },
      },
    ],
    unread: 0,
    typingUntil: null,
    composerEnabled: true,
    handRaised: false,
    appliedWrapUps: [],
    aiContext: [],
    sla: { totalDuration: 0, deadline: null, color: "sla-normal", popup: false },
    wrapUp: { show: false, deadline: null },
    hold: { active: false, deadline: null },
    waitingSince: Date.now(),
    lastMessageAt: Date.now(),
  };
}
