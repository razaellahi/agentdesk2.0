import { socketManager } from "@/core/realtime";
import { getSession } from "@/core/auth";
import { useAgentStore } from "../store/agentStore";
import { changeMrdState } from "./commands";
let restore: { userId: string; mrdId: string } | null = null;
export function forgetVoiceMrd() {
  restore = null;
}
/** Restore only the readiness that this operation changed, within the same identity. */
export function restoreVoiceMrd() {
  const previous = restore;
  restore = null;
  if (!previous || getSession().user?.id !== previous.userId || !socketManager.connected) return;
  const state = useAgentStore
    .getState()
    .presence?.agentMrdStates.find((m) => m.mrd.id === previous.mrdId)?.state;
  if (state === "NOT_READY") changeMrdState(previous.mrdId, "READY");
}
/** Outbound telephony starts only after agent-manager acknowledges Not Ready on the voice MRD. */
export async function prepareVoiceMrd(): Promise<void> {
  const voice = useAgentStore.getState().presence?.agentMrdStates.find((m) => /voice/i.test(m.mrd.name));
  if (!voice || !socketManager.connected) throw new Error("Agent voice state is unavailable.");
  if (voice.state === "NOT_READY") return;
  const userId = getSession().user?.id;
  if (!userId) throw new Error("Agent session has ended.");
  if (voice.state === "READY") restore = { userId, mrdId: voice.mrd.id };
  await new Promise<void>((resolve, reject) => {
    let done = false;
    const finish = (error?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsubscribe();
      if (error) {
        restoreVoiceMrd();
        reject(error);
      } else resolve();
    };
    const unsubscribe = useAgentStore.subscribe((s) => {
      if (getSession().user?.id !== userId) {
        finish(new Error("Agent session has changed."));
        return;
      }
      if (s.presence?.agentMrdStates.some((m) => m.mrd.id === voice.mrd.id && m.state === "NOT_READY"))
        finish();
    });
    const timer = setTimeout(() => finish(new Error("Agent voice state did not become Not Ready.")), 5000);
    changeMrdState(voice.mrd.id, "NOT_READY");
  });
}
