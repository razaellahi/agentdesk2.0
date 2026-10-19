import type { CimEvent, CimMessage } from "./types";

export type Translate = (key: string, params?: Record<string, unknown>) => string;

export const lower = (value: unknown) => (typeof value === "string" ? value.toLowerCase() : "");

let seq = 0;
const localId = () => `sys-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function base(event: CimEvent): CimMessage {
  return {
    id: event.id ? `system:${event.id}` : localId(),
    header: {
      timestamp: event.timestamp as number,
      sender: { type: "system" },
      channelSession: {},
      channelData: {},
    },
    body: { type: "systemNotification", markdownText: "" },
  };
}

/** session-end reason suffix (unified-agent getChannelSessionEndedReason). */
export function channelSessionEndedReason(event: CimEvent, t: Translate): string {
  const code = lower(event.data?.state?.reasonCode);
  const key =
    code === "customer"
      ? "customer"
      : ["agent", "agent-handled", "agent_handled"].includes(code)
        ? "agent"
        : code === "network"
          ? "network"
          : code === "force_closed"
            ? "force_closed"
            : code === "inactivity"
              ? "inactivity"
              : code === "force-closed"
                ? "force-closed"
                : "unknown";
  return ` ${t(`session-end-reasons.${key}`)}`;
}

const modeLabel = (mode: string) =>
  lower(mode) === "agent" ? "Agent" : lower(mode) === "queue" ? "Queue" : "";

/** Transfer / consult texts for task_state_changed (handleTaskStateChangeForAgentAssistance). */
function taskStateText(event: CimEvent, t: Translate): string | null {
  const media: {
    type: { direction: string; mode: string; metadata?: { requestedBy?: string } };
    state: string;
  }[] = event.data?.task?.activeMedia ?? [];
  let text: string | null = null;
  for (const m of media) {
    const by = m.type?.metadata?.requestedBy;
    if (m.type.direction === "DIRECT_TRANSFER" && m.state === "RESERVED") {
      text = by
        ? `${modeLabel(m.type.mode)} ${t("socket-service.transfer-request-has-been-placed-by")} ${by}`
        : `${modeLabel(m.type.mode)} ${t("socket-service.transfer-request-has-been-placed")}`;
    } else if (m.type.direction === "CONSULT" && m.state === "RESERVED") {
      text = by
        ? `${modeLabel(m.type.mode)} ${t("socket-service.consult-request-has-been-placed-by")} ${by}`
        : `${modeLabel(m.type.mode)} ${t("socket-service.consult-request-has-been-placed")}`;
    } else if (m.type.direction === "CONSULT_TRANSFER" && m.state === "ACTIVE") {
      text = t("socket-service.consult-transfer-request-has-been-placed");
    } else if (m.type.direction === "CONSULT_CONFERENCE" && m.state === "ACTIVE") {
      text = t("socket-service.consult-conference-request-has-been-placed");
    } else {
      text = null;
    }
  }
  return text;
}

/**
 * System notification shown inline in the conversation for lifecycle events
 * (port of unified-agent createSystemNotificationMessage). Returns null when the
 * event has no visible message.
 */
export function systemMessageFor(event: CimEvent, ctx: { agentId: string; t: Translate }): CimMessage | null {
  const { t, agentId } = ctx;
  const name = lower(event.name);
  const msg = base(event);
  const who = (user: { id: string; username: string }) => (user.id === agentId ? "You" : user.username);
  const joined = (display: string) =>
    display === "You"
      ? t("socket-service.have-joined-the-conversation")
      : t("socket-service.has-joined-the-conversation");

  switch (name) {
    case "conversation_data_changed":
      msg.body.type = "conversationData";
      msg.body.conversationData = event.data;
      return msg;
    case "channel_session_started":
      msg.body.displayText = event.data.channel.channelType.name;
      msg.body.markdownText = t("socket-service.session-started");
      return msg;
    case "channel_session_ended":
      msg.body.displayText = event.data.channel.channelType.name;
      msg.body.markdownText = channelSessionEndedReason(event, t);
      return msg;
    case "call_leg_ended":
    case "voice_activity":
    case "voice_mail_activity": {
      msg.body.type = "VOICE";
      msg.body.data = event.data;
      const intent = lower(event.data?.header?.intent);
      if (name === "voice_mail_activity" || intent === "voice_mail_activity") {
        msg.header.intent = "VOICE_MAIL_ACTIVITY";
        const cs = event.channelSession ?? event.data?.channelSession ?? event.data?.header?.channelSession;
        if (cs) {
          msg.header.channelSession = cs;
          msg.header.channelData = cs.channelData ?? event.data?.header?.channelData ?? {};
        }
        msg.body.additionalDetail = {
          recordingUrl: event.data?.recordingUrl || "",
          recordingDuration: event.data?.duration || 0,
          agentInfo: event.data?.additionalDetails?.agentInfo || {},
          status: event.data?.additionalDetails?.status || "unread",
        };
      }
      return msg;
    }
    case "agent_subscribed": {
      if (lower(event.data.agentParticipant.role) === "silent_monitor") return null;
      const display = who(event.data.agentParticipant.participant.keycloakUser);
      msg.body.displayText = display;
      msg.body.markdownText = joined(display);
      return msg;
    }
    case "participant_role_changed": {
      const role = lower(event.data.conversationParticipant.role);
      const display = who(event.data.conversationParticipant.participant.keycloakUser);
      if (role === "primary" || role === "whisper") {
        msg.body.displayText = display;
        msg.body.markdownText = joined(display);
        return msg;
      }
      if (role === "wrap_up") {
        msg.body.displayText = display;
        msg.body.markdownText = t("socket-service.left-the-conversation");
        return msg;
      }
      return null;
    }
    case "agent_unsubscribed": {
      const role = lower(event.data.agentParticipant.role);
      if (role === "silent_monitor" || role === "wrap_up") return null;
      msg.body.displayText = who(event.data.agentParticipant.participant.keycloakUser);
      msg.body.markdownText = t("socket-service.left-the-conversation");
      return msg;
    }
    case "task_enqueued": {
      const queued = (event.data.task?.activeMedia ?? []).find(
        (m: { state: string }) => lower(m.state) === "queued",
      );
      if (!queued) return null;
      const mode = modeLabel(queued.type.mode);
      const by = queued.type.metadata?.requestedBy;
      msg.body.displayText = "";
      if (queued.type.direction === "DIRECT_TRANSFER") {
        msg.body.markdownText = by
          ? `${mode} ${t("socket-service.transfer-request-has-been-placed-by")} ${by}`
          : `${mode} ${t("socket-service.transfer-request-has-been-placed")}`;
        return msg;
      }
      if (queued.type.direction === "DIRECT_CONFERENCE") {
        msg.body.markdownText =
          `${mode} ${t("socket-service.conference-request-has-been-placed-by")} ${by ?? ""}`.trim();
        return msg;
      }
      return null;
    }
    case "no_agent_available": {
      const direction = lower(event.data.requestType?.direction);
      const label =
        direction === "direct_transfer"
          ? "Transfer"
          : direction === "direct_conference"
            ? "Conference"
            : direction === "consult"
              ? "Consult"
              : null;
      if (!label) return null;
      msg.body.displayText = "";
      msg.body.markdownText = `${t("socket-service.No-agent-is-available-for")} ${modeLabel(event.data.requestType.mode)} ${label}`;
      return msg;
    }
    case "task_state_changed": {
      let text = event.data?.task?.state ? taskStateText(event, t) : null;
      const media = event.data?.task?.activeMedia ?? [];
      const last = media[media.length - 1];
      if (
        lower(event.data?.task?.state?.reasonCode) === "force_closed" &&
        lower(last?.type?.direction) === "direct_conference"
      ) {
        text = t("socket-service.conference-request-has-cancelled");
      }
      if (!text) return null;
      msg.body.displayText = "";
      msg.body.markdownText = text;
      return msg;
    }
    default:
      return null;
  }
}
