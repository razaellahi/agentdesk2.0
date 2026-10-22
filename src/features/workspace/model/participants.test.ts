import { describe, expect, it } from "vitest";
import { conversationFixture } from "@/test/conversations";
import {
  effectiveWhisper,
  isCiscoSession,
  isCxVoiceSession,
  visibleAgents,
  whisperPeers,
} from "./participants";
import type { AgentParticipant, ChannelSession } from "./types";

function agent(id: string, role: string): AgentParticipant {
  return {
    role,
    participant: { id, participantType: "CCUser", keycloakUser: { id, username: id } },
  } as AgentParticipant;
}

function session(name: string): ChannelSession {
  return { id: name, channel: { channelType: { name } }, channelData: {} } as ChannelSession;
}

describe("conversation participants", () => {
  it("never lists a supervisor who is monitoring silently", () => {
    const c = conversationFixture();
    c.agentParticipants = [agent("sup", "SILENT_MONITOR"), agent("helper", "ASSISTANT")];
    expect(visibleAgents(c).map((p) => p.participant.id)).toEqual(["helper"]);
  });

  it("counts whisper readers without silent monitors", () => {
    const c = conversationFixture();
    c.agentParticipants = [agent("sup", "SILENT_MONITOR")];
    expect(whisperPeers(c)).toBe(0);
    c.agentParticipants.push(agent("helper", "ASSISTANT"));
    expect(whisperPeers(c)).toBe(1);
  });

  it("whispers for a primary only by choice and only while someone can read it", () => {
    const c = conversationFixture();
    expect(effectiveWhisper(c, true)).toBe(false);
    c.agentParticipants = [agent("helper", "ASSISTANT")];
    expect(effectiveWhisper(c, true)).toBe(true);
    expect(effectiveWhisper(c, undefined)).toBe(false);
    c.topicParticipant.role = "WHISPER";
    expect(effectiveWhisper(c, false)).toBe(true);
  });

  it("assigns a WebRTC session to whichever voice stack is on", () => {
    expect(isCxVoiceSession(session("CX_VOICE"), { cxVoice: false, cisco: false })).toBe(true);
    expect(isCxVoiceSession(session("WEB_RTC"), { cxVoice: true, cisco: false })).toBe(true);
    expect(isCiscoSession(session("WEB_RTC"), { cxVoice: true, cisco: false })).toBe(false);
    expect(isCiscoSession(session("WEB_RTC"), { cxVoice: false, cisco: true })).toBe(true);
  });
});
