export interface ActivityLeg {
  id?: string;
  sender?: { id?: string; senderName?: string; type?: string };
  startDirection?: string;
  endDirection?: string;
  duration?: number;
  voiceRecordingUrl?: string;
  additionalDetail?: {
    customerNumber?: string;
    dialog?: {
      customerNumber?: string;
      ani?: string;
      queueName?: string;
      wrapUpReason?: string;
      wrapUpItems?: string | string[];
    };
    activities?: { menu?: string; selection?: string }[];
  };
}
export interface VoiceActivity {
  startTime?: string | number;
  endTime?: string | number;
  duration?: number;
  recordingUrl?: string;
  callLegs?: ActivityLeg[];
}
export function activityCustomerNumber(legs: ActivityLeg[]) {
  return legs
    .filter((leg) => ["INBOUND", "OUTBOUND", "CONSULT_CONFERENCE"].includes(leg.startDirection ?? ""))
    .map(
      (leg) =>
        leg.additionalDetail?.dialog?.customerNumber ??
        leg.additionalDetail?.dialog?.ani ??
        leg.additionalDetail?.customerNumber,
    )
    .filter(Boolean)
    .at(-1);
}
export function canPlayActivityRecording(
  all: boolean,
  own: boolean,
  agentId: string | undefined,
  legs: ActivityLeg[],
) {
  return all || Boolean(own && agentId && legs.some((leg) => leg.sender?.id === agentId));
}
