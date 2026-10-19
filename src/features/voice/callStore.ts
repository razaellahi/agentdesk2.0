import { create } from "zustand";

export type CallPhase = "idle" | "dialing" | "ringing" | "active" | "held";
export type VoiceStack = "sip" | "finesse";
export interface CallParticipant {
  mediaAddress?: string;
  state?: string;
  mute?: boolean;
  startTime?: string;
  stateChangeTime?: string;
  alertingTime?: string;
  actions?: { action?: string[] };
}
export interface VoiceDialog {
  id?: string;
  fromAddress?: string;
  customerNumber?: string;
  dialedNumber?: string;
  state?: string;
  callType?: string;
  channelType?: string;
  serviceIdentifier?: string;
  participants?: CallParticipant[];
  recording?: { recording?: string; status?: string };
  isCallEnded?: number;
  callEndReason?: string;
  callVariables?: { CallVariable?: { name?: string; value?: unknown }[] };
  [key: string]: unknown;
}
export interface CallLeg {
  id: string;
  phase: Exclude<CallPhase, "idle">;
  peer: string;
  muted: boolean;
  startedAt: number | null;
  dialog: VoiceDialog;
}
export interface CallSnapshot {
  phase: CallPhase;
  dialogId: string | null;
  peer: string;
  muted: boolean;
  stack: VoiceStack | null;
  registered: boolean;
  main: CallLeg | null;
  consult: CallLeg | null;
  conference: boolean;
  campaign: boolean;
  recording: "unavailable" | "started" | "paused" | "stopped";
  recordingDialogId: string | null;
  video: boolean;
  screenShare: boolean;
  lastError: string | null;
}
export const emptyCall: CallSnapshot = {
  phase: "idle",
  dialogId: null,
  peer: "",
  muted: false,
  stack: null,
  registered: false,
  main: null,
  consult: null,
  conference: false,
  campaign: false,
  recording: "unavailable",
  recordingDialogId: null,
  video: false,
  screenShare: false,
  lastError: null,
};
export const useCallStore = create<
  CallSnapshot & {
    patch: (next: Partial<CallSnapshot>) => void;
    reset: () => void;
  }
>()((set) => ({ ...emptyCall, patch: (next) => set(next), reset: () => set(emptyCall) }));
export interface VoiceEvent {
  event?: string;
  response?: {
    state?: string;
    dialog?: VoiceDialog | null;
    recording?: VoiceDialog["recording"];
    message?: string;
    reason?: string;
    [key: string]: unknown;
  };
  dialog?: VoiceDialog;
  recording?: VoiceDialog["recording"];
  [key: string]: unknown;
}
/** Provider callbacks are authoritative. Consult events never overwrite the customer leg. */
export function reduceVoiceEvent(
  current: CallSnapshot,
  event: VoiceEvent,
  stack: VoiceStack,
  extension = "",
  now = Date.now(),
): CallSnapshot {
  const name = event.event?.toLowerCase() ?? "";
  const dialog = event.dialog ?? event.response?.dialog;
  const state = (dialog?.state ?? event.response?.state ?? "").toLowerCase();
  const next = { ...current, stack };
  if (name === "agentinfo" || name === "agentstate") {
    if (
      state === "login" ||
      ["ready", "not_ready", "reserved", "talking", "work", "work_ready"].includes(state)
    )
      next.registered = true;
    if (state === "logout") return { ...emptyCall, stack };
    if (
      state === "not_ready" &&
      String(event.response?.reason ?? "")
        .toLowerCase()
        .includes("rona")
    )
      next.lastError = "Call was not answered; agent is Not Ready.";
    return next;
  }
  if (name === "error") {
    next.lastError = String(event.response?.message ?? event.response?.reason ?? "Voice command failed");
    if (current.phase === "dialing" && !current.dialogId) next.phase = "idle";
    return next;
  }
  if (name === "mediapermissionstatus") {
    if (
      dialog?.permissionStatus === "denied" ||
      event.response?.status === "denied" ||
      event.response?.permission === false
    )
      next.lastError = "Microphone or camera permission was denied.";
    return next;
  }
  if (name === "mediastreamupdate") {
    if (dialog?.stream === "video") next.video = dialog.streamStatus === "on";
    if (dialog?.stream === "screenshare") next.screenShare = dialog.streamStatus === "on";
    return next;
  }
  if (name === "recording_state") {
    if (dialog?.id && ![current.main?.id, current.consult?.id].includes(dialog.id)) return current;
    const rec = event.recording ?? dialog?.recording ?? event.response?.recording;
    next.recording =
      rec?.recording?.toLowerCase() === "enabled" &&
      ["started", "paused", "stopped"].includes(rec.status?.toLowerCase() ?? "")
        ? (rec.status!.toLowerCase() as CallSnapshot["recording"])
        : "unavailable";
    next.recordingDialogId = dialog?.id ?? current.dialogId;
    return next;
  }
  if (!dialog?.id) return next;
  const isConsult =
    current.consult?.id === dialog.id ||
    (name === "consultcall" && (Boolean(current.main) || dialog.fromAddress === extension));
  if (!isConsult && current.main && current.main.id !== dialog.id) return current;
  const previous = isConsult ? current.consult : current.main;
  const participant = dialog.participants?.find((p) => p.mediaAddress === extension);
  const legState = (participant?.state ?? state).toLowerCase();
  if (
    ["dropped", "ended", "terminated"].includes(legState) ||
    dialog.isCallEnded === 1 ||
    name === "callended"
  ) {
    if (isConsult) next.consult = null;
    else if (!current.main || current.main.id === dialog.id) {
      next.main = current.consult;
      next.consult = null;
      next.video = false;
      next.screenShare = false;
      next.conference = false;
      next.campaign = false;
      next.recording = "unavailable";
      next.recordingDialogId = null;
    }
  } else {
    const phase =
      legState === "held"
        ? "held"
        : legState === "active" || legState === "talking"
          ? "active"
          : legState === "initiating" || name === "outbounddialing"
            ? "dialing"
            : "ringing";
    const started = participant?.startTime ? Date.parse(participant.startTime) : NaN;
    const leg: CallLeg = {
      id: dialog.id,
      phase,
      peer: dialog.customerNumber ?? dialog.dialedNumber ?? dialog.fromAddress ?? previous?.peer ?? "",
      muted: participant?.mute ?? previous?.muted ?? false,
      startedAt:
        previous?.startedAt ?? (phase === "active" ? (Number.isFinite(started) ? started : now) : null),
      dialog: { ...previous?.dialog, ...dialog },
    };
    if (isConsult) next.consult = leg;
    else next.main = leg;
    next.conference =
      (dialog.callType ?? "").toLowerCase().includes("conference") ||
      (dialog.participants?.filter((p) => p.state?.toLowerCase() === "active").length ?? 0) > 2;
    if (name === "campaigncall") next.campaign = true;
    next.lastError = null;
  }
  next.phase = next.main?.phase ?? "idle";
  next.dialogId = next.main?.id ?? null;
  next.peer = next.main?.peer ?? "";
  next.muted = next.main?.muted ?? false;
  return next;
}
export function applyVoiceEvent(event: VoiceEvent, stack: VoiceStack, extension = "") {
  useCallStore.getState().patch(reduceVoiceEvent(useCallStore.getState(), event, stack, extension));
}
export function applySipEvent(event: VoiceEvent) {
  applyVoiceEvent(event, "sip");
}
