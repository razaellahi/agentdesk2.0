import { getDeskSettings } from "@/core/agent-settings";
import { cimCustomerApi } from "@/core/api";
import { can, getSession } from "@/core/auth";
import {
  getOutboundFromChannels,
  shouldBlockOutbound,
  prepareVoiceMrd,
  restoreVoiceMrd,
} from "@/features/workspace";
import { useCallStore } from "./callStore";
import { postFinesse, postSip, type CtiCommand } from "./scripts";
import { getVoiceConnection, voiceCallback } from "./voiceSession";

export type VoiceAction =
  | "answer"
  | "reject"
  | "skip"
  | "end"
  | "hold"
  | "resume"
  | "mute"
  | "unmute"
  | "dtmf"
  | "transfer"
  | "consult"
  | "consultTransfer"
  | "conference"
  | "pauseRecording"
  | "resumeRecording"
  | "video"
  | "screenShare"
  | "barge";
export interface VoiceCommandInput {
  dialogId?: string;
  number?: string;
  digits?: string;
  video?: boolean;
  on?: boolean;
  destinationType?: "agent" | "queue" | "external";
  queueDn?: string;
  externalDn?: string;
}
export function buildVoiceCommand(
  action: VoiceAction,
  input: VoiceCommandInput,
  stack: "sip" | "finesse",
): CtiCommand {
  const id = input.dialogId;
  const commands: Record<VoiceAction, CtiCommand> = {
    answer: {
      action: "answerCall",
      parameter: { dialogId: id, answerCalltype: input.video ? "video" : "audio" },
    },
    reject: { action: "rejectCall", parameter: { dialogId: id, reason: "REJECTED" } },
    skip: { action: "rejectCall", parameter: { dialogId: id, reason: "SKIP" } },
    end: { action: "releaseCall", parameter: { dialogId: id } },
    hold: { action: "holdCall", parameter: { dialogId: id } },
    resume: { action: "retrieveCall", parameter: { dialogId: id } },
    mute: { action: "mute_call", parameter: { dialogId: id } },
    unmute: { action: "unmute_call", parameter: { dialogId: id } },
    dtmf: { action: "SendDtmf", parameter: { dialogId: id, message: input.digits } },
    transfer: { action: "SST", parameter: { dialogId: id, numberToTransfer: input.number } },
    consult: { action: "makeConsult", parameter: { dialogId: id, numberToConsult: input.number } },
    consultTransfer: { action: "consultTransfer", parameter: { dialogId: id } },
    conference: {
      action: stack === "sip" ? "conference_consult" : "conferenceCall",
      parameter: { dialogId: id },
    },
    pauseRecording: { action: "pauseRecording", parameter: { dialogId: id } },
    resumeRecording: { action: "resumeRecording", parameter: { dialogId: id } },
    video: {
      action: "convertCall",
      parameter: { dialogId: id, streamType: "video", streamStatus: input.on ? "on" : "off" },
    },
    screenShare: {
      action: "convertCall",
      parameter: { dialogId: id, streamType: "screenshare", streamStatus: input.on ? "on" : "off" },
    },
    barge: { action: "bargeIn", parameter: { dialogId: id } },
  };
  if (
    stack === "finesse" &&
    ["mute", "unmute", "dtmf", "video", "screenShare", "pauseRecording", "resumeRecording"].includes(action)
  )
    throw new Error("This control is unavailable for Cisco.");
  if (input.destinationType === "queue" && ["transfer", "consult"].includes(action)) {
    if (stack !== "sip") throw new Error("Queue destinations require CX Voice.");
    if (!input.queueDn) throw new Error("Queue transfer DN is not configured.");
    return {
      action: action === "transfer" ? "SST_Queue" : "makeConsultQueue",
      parameter: { dialogId: id, queue: input.number, queueType: "ID", numberToTransfer: input.queueDn },
    };
  }
  if (input.destinationType === "external" && ["transfer", "consult"].includes(action) && stack === "sip") {
    if (!input.externalDn) throw new Error("External transfer DN is not configured.");
    commands[action].parameter = {
      dialogId: id,
      [action === "transfer" ? "numberToTransfer" : "numberToConsult"]:
        `${input.externalDn}-${input.number?.trim()}`,
    };
  }
  return commands[action];
}
function deliver(command: CtiCommand) {
  const call = useCallStore.getState();
  const stack = call.stack ?? "sip";
  const callback = voiceCallback(stack);
  const next = { ...command, parameter: { ...command.parameter, clientCallbackFunction: callback } };
  if (stack === "finesse") postFinesse(next);
  else postSip(next);
}
/** Re-check current permissions and call state immediately before issuing a command. */
export function voiceCommand(action: VoiceAction, input: VoiceCommandInput = {}) {
  const call = useCallStore.getState();
  if (!can("agentSession") || !call.registered) throw new Error("Voice is not connected.");
  const capability =
    action === "transfer" || action === "consultTransfer"
      ? "directTransfer"
      : action === "consult"
        ? "consult"
        : action === "conference"
          ? "conference"
          : action === "barge"
            ? "supervisor"
            : action === "pauseRecording" || action === "resumeRecording"
              ? "callRecordingControl"
              : null;
  if (capability && !can(capability)) throw new Error("You do not have permission for this action.");
  const target = input.dialogId ?? (action === "conference" ? call.consult?.id : call.dialogId);
  if (!target || ![call.main?.id, call.consult?.id].includes(target)) throw new Error("The call has ended.");
  const leg = target === call.consult?.id ? call.consult : call.main;
  if (["answer", "reject", "skip"].includes(action) && leg?.phase !== "ringing")
    throw new Error("This call is no longer ringing.");
  if (["consultTransfer", "conference"].includes(action) && call.consult?.phase !== "active")
    throw new Error("Wait for the consulted agent to answer.");
  if (["transfer", "consult"].includes(action) && !input.number?.trim())
    throw new Error("Choose a destination.");
  if (action === "dtmf" && !/^[0-9*#ABCD]+$/.test(input.digits ?? "")) throw new Error("Invalid digits.");
  const settings = getDeskSettings().cxVoiceSettings;
  const command = buildVoiceCommand(
    action,
    {
      ...input,
      queueDn: settings.staticQueueTransferDn,
      externalDn: settings.sipExternalDn,
      dialogId: target,
    },
    call.stack ?? "sip",
  );
  if (action === "pauseRecording" || action === "resumeRecording") {
    const connection = getVoiceConnection();
    if (
      !connection?.voiceConnectorUrl ||
      !connection.eslHost ||
      !["started", "paused"].includes(call.recording)
    )
      throw new Error("Recording controls are unavailable.");
    command.parameter = { ...command.parameter, ...connection, dialogId: call.recordingDialogId ?? target };
  }
  deliver(command);
}
/** Shared by dial pad, phonebook and header. Never marks an unconfirmed call active. */
export async function placeOutboundVoice(
  number: string,
  options: { customer?: { labels?: unknown[] }; serviceIdentifier?: string } = {},
) {
  const owner = getSession().user?.id;
  const call = useCallStore.getState();
  if (!can("agentSession") || !call.registered || call.phase !== "idle")
    throw new Error("Finish the current call before starting another.");
  const destination = number.trim();
  if (!destination) throw new Error("Enter a phone number.");
  let customer = options.customer;
  if (!customer) {
    const page = await cimCustomerApi.get<{ docs?: { labels?: unknown[] }[] }>("/customers", {
      searchParams: { paginateQuery: `voice:${destination}`, limit: 1, offset: 0 },
    });
    customer = page?.docs?.[0];
  }
  const check = await shouldBlockOutbound({
    customer,
    value: destination,
    channel: "CX_VOICE",
    complianceEnabled: getDeskSettings().callingCompliance,
  });
  if (check.blocked) throw new Error(`Outbound call blocked: ${check.reason}`);
  const from = options.serviceIdentifier || (await getOutboundFromChannels("CX_VOICE")).selected;
  if (call.stack === "sip" && !from) throw new Error("Choose a configured outbound From channel.");
  if (!owner || getSession().user?.id !== owner || !can("agentSession"))
    throw new Error("Voice session changed; try again.");
  await prepareVoiceMrd();
  if (
    getSession().user?.id !== owner ||
    !can("agentSession") ||
    !useCallStore.getState().registered ||
    useCallStore.getState().phase !== "idle"
  )
    throw new Error("Voice connection changed; try again.");
  const command = {
    action: call.stack === "finesse" ? "makeCall" : "makeOBCall",
    parameter: {
      calledNumber: destination,
      Destination_Number: from,
      serviceIdentifier: from,
      callType: "audio",
    },
  };
  try {
    deliver(command);
  } catch (error) {
    restoreVoiceMrd();
    throw error;
  }
  useCallStore.getState().patch({ phase: "dialing", peer: destination });
}
export function externalVoiceNumber(number: string) {
  const prefix = String(getDeskSettings().cxVoiceSettings.sipExternalDn ?? "");
  return prefix ? `${prefix}-${number.trim()}` : number.trim();
}

/** Supervisor commands share the same callback, permission and MRD checks as agent calls. */
export async function superviseVoice(
  action: "silentMonitor" | "bargeIn",
  input: { dialogId?: string; number?: string; serviceIdentifier?: string },
) {
  const owner = getSession().user?.id;
  const state = useCallStore.getState();
  if (!can("supervisor") || !state.registered || state.stack !== "sip")
    throw new Error("Supervisor CX Voice is unavailable.");
  if (action === "silentMonitor" && state.phase !== "idle")
    throw new Error("Finish the current call before monitoring another.");
  if ((action === "bargeIn" && !input.dialogId) || (action === "silentMonitor" && !input.number))
    throw new Error("The voice session is unavailable.");
  await prepareVoiceMrd();
  if (getSession().user?.id !== owner || !can("supervisor") || !useCallStore.getState().registered)
    throw new Error("Supervisor voice session changed.");
  const parameter =
    action === "bargeIn"
      ? { dialogId: input.dialogId }
      : {
          calledNumber: input.number,
          callType: "audio",
          Destination_Number: input.number,
          service_Identifier: input.serviceIdentifier,
        };
  try {
    deliver({ action, parameter });
  } catch (error) {
    restoreVoiceMrd();
    throw error;
  }
}
