import { useDeskSettings } from "@/core/agent-settings";
import { useCallStore } from "@/features/voice";
import type { VoiceStacks } from "../model/participants";
import type { LiveCall } from "../session/assistance";

/** The agent's live call legs, as conversation controls need them. */
export function useLiveCall(): LiveCall {
  const main = useCallStore((s) => s.main);
  const consult = useCallStore((s) => s.consult);
  const conference = useCallStore((s) => s.conference);
  return {
    dialogIds: [main?.id, consult?.id].filter((id): id is string => Boolean(id)),
    conference,
    consulting: Boolean(main && consult),
    webRtc: main?.dialog.channelType?.toLowerCase() === "web_rtc",
  };
}

/** Which voice stacks the desk runs; a WebRTC session belongs to whichever is on. */
export function useVoiceStacks(): VoiceStacks {
  const settings = useDeskSettings();
  return { cxVoice: Boolean(settings?.cxVoice), cisco: Boolean(settings?.cisco) };
}
