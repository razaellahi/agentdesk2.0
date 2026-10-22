import { lower } from "./systemMessages";
import type { AgentParticipant, ChannelSession, Conversation } from "./types";

/** Roles of other agents a whisper reaches (unified-agent countAgentPartcipants). */
const PEER_ROLES = ["PRIMARY", "ASSISTANT", "WHISPER", "WRAP_UP"];

/** Other agents the agent may see: a silently monitoring supervisor is never listed. */
export function visibleAgents(conversation: Pick<Conversation, "agentParticipants">): AgentParticipant[] {
  return conversation.agentParticipants.filter((p) => p.role !== "SILENT_MONITOR");
}

/** How many other agents would read a whisper. */
export function whisperPeers(conversation: Pick<Conversation, "agentParticipants">): number {
  return conversation.agentParticipants.filter((p) => PEER_ROLES.includes(p.role)).length;
}

/**
 * Whether a reply goes to agents only. Whisperers and assistants never reach the
 * customer; a primary whispers only by choice, and only while someone can read it.
 */
export function effectiveWhisper(
  conversation: Pick<Conversation, "agentParticipants" | "topicParticipant">,
  chosen: boolean | undefined,
): boolean {
  const role = conversation.topicParticipant.role;
  if (role === "WHISPER" || role === "ASSISTANT") return true;
  return role === "PRIMARY" && chosen === true && whisperPeers(conversation) > 0;
}

/** Which voice stacks are on, since a WEB_RTC session belongs to whichever one is. */
export interface VoiceStacks {
  cxVoice: boolean;
  cisco: boolean;
}

/** checkCXSession: a CX Voice call, or a WebRTC call when CX Voice is the stack. */
export function isCxVoiceSession(session: ChannelSession, stacks: VoiceStacks): boolean {
  const name = lower(session.channel?.channelType?.name);
  return name === "cx_voice" || (name === "web_rtc" && stacks.cxVoice);
}

/** checkCiscoSession: a Cisco call, or a WebRTC call when Cisco is the stack. */
export function isCiscoSession(session: ChannelSession, stacks: VoiceStacks): boolean {
  const name = lower(session.channel?.channelType?.name);
  return name === "cisco_cc" || (name === "web_rtc" && stacks.cisco);
}

export function cxVoiceSessionOf(
  conversation: Pick<Conversation, "activeChannelSessions">,
  stacks: VoiceStacks,
): ChannelSession | undefined {
  return conversation.activeChannelSessions.find((s) => isCxVoiceSession(s, stacks));
}

/** The assistants a primary can hand the conversation to after a consult. */
export function consultedAgents(conversation: Pick<Conversation, "agentParticipants">): AgentParticipant[] {
  return conversation.agentParticipants.filter((p) => p.role === "ASSISTANT");
}
