/**
 * CIM (Customer Interaction Management) shapes used by agent-manager events.
 * Kept structural and permissive: backends add fields over time, and unknown
 * fields must flow through untouched (they are echoed back on publish).
 */
export interface ChannelType {
  id?: string;
  name: string;
  channelLogo?: string;
  isInteractive?: boolean;
  mediaRoutingDomain?: string;
}

export interface Channel {
  id?: string;
  name?: string;
  serviceIdentifier?: string;
  channelType: ChannelType;
  channelConfig?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Customer {
  _id: string;
  firstName?: string;
  lastName?: string | null;
  isAnonymous?: boolean;
  labels?: unknown[];
  [key: string]: unknown;
}

export interface ChannelData {
  channelCustomerIdentifier?: string;
  serviceIdentifier?: string;
  additionalAttributes?: { key?: string; type?: string; value?: unknown }[];
  [key: string]: unknown;
}

export interface ChannelSession {
  id: string;
  channel: Channel;
  customer?: Customer;
  channelData: ChannelData;
  conversationId?: string;
  state?: { name?: string; reasonCode?: string };
  channelSessionDirection?: string;
  /** UI flags kept on the session, as unified-agent did. Stripped before publishing. */
  isChecked?: boolean;
  isDisabled?: boolean;
  webChannelData?: unknown;
  [key: string]: unknown;
}

export interface KeycloakUserRef {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
}

export interface TopicParticipant {
  id: string;
  type: string;
  participant: {
    id: string;
    participantType: string;
    keycloakUser: KeycloakUserRef;
    associatedRoutingAttributes?: unknown[];
  };
  token: null;
  conversationId: string;
  role: string;
  userCredentials: null;
  state: string;
}

export interface Sender {
  id?: string;
  senderName?: string;
  type?: string;
  additionalDetail?: Record<string, unknown>;
}

export type MessageStatus = "sending" | "sent" | "seen" | "failed";

export interface CimMessage {
  id: string;
  header: {
    timestamp?: number | string;
    sender: Sender;
    channelSession?: ChannelSession | Record<string, unknown>;
    channelData?: ChannelData;
    intent?: string | null;
    originalMessageId?: string;
    status?: MessageStatus;
    seenStatuses?: Sender[];
    additionalData?: Record<string, unknown>;
    customer?: Customer;
    [key: string]: unknown;
  };
  body: {
    type: string;
    markdownText?: string;
    isWhisper?: boolean;
    [key: string]: unknown;
  };
  isEdited?: boolean;
  isLiked?: boolean;
  isHidden?: boolean;
  isDeleted?: boolean;
  botSuggestions?: unknown[];
  [key: string]: unknown;
}

export interface CimEvent {
  id?: string;
  name: string;
  type?: string;
  timestamp?: number | string;
  conversationId?: string;
  channelSession?: ChannelSession;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- payload varies per event name
  [key: string]: unknown;
}

export interface AgentParticipant {
  id?: string;
  type?: string;
  role: string;
  participant: { id: string; keycloakUser: KeycloakUserRef; [key: string]: unknown };
  [key: string]: unknown;
}

export interface EmbeddedApp {
  id?: string;
  title?: string;
  value?: string;
  agentId?: string | null;
  [key: string]: unknown;
}

export type SlaColor = "sla-normal" | "sla-warn" | "sla-red" | "sla-ended";

export interface ConversationContextEntry {
  role: "agent" | "customer" | "bot" | "whisper" | "system";
  text: string;
}

/**
 * One conversation the agent is subscribed to. Timers are stored as absolute
 * deadlines (epoch ms) and rendered from a shared 1 s clock instead of a
 * setInterval per conversation (fixes the leaks listed in unified-agent's
 * CHATS_COMPONENT_MEMORY_LEAKS doc).
 */
export interface Conversation {
  conversationId: string;
  roomInfo: unknown;
  taskId: string;
  state: "ACTIVE" | "CLOSED";
  /** Order the agent received it (rail ordering). */
  seq: number;
  customer: Customer;
  customerSuggestions: unknown[];
  topicParticipant: TopicParticipant;
  firstChannelSession: ChannelSession | null;
  activeChannelSessions: ChannelSession[];
  agentParticipants: AgentParticipant[];
  messages: CimMessage[];
  embeddedApps: EmbeddedApp[];
  activeConversationData: unknown;
  unread: number;
  /** Customer typing indicator expires at this time. */
  typingUntil: number | null;
  composerEnabled: boolean;
  handRaised: boolean;
  appliedWrapUps: unknown[];
  aiContext: ConversationContextEntry[];
  sla: { totalDuration: number; deadline: number | null; color: SlaColor; popup: boolean };
  wrapUp: { show: boolean; deadline: number | null };
  /** deadline null + active = paused without end time (backend-interrupted MRD). */
  hold: { active: boolean; deadline: number | null };
  /** Timestamp of the customer's oldest message not yet answered by the agent. */
  waitingSince: number | null;
  lastMessageAt: number;
}
