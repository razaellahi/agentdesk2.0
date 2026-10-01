import { createLogger } from "@/core/logging/logger";

const log = createLogger("crm");

/**
 * postMessage bridge to a parent CRM window (Dynamics 365, Salesforce …) when
 * Agent Desk is embedded. Event names and payload shapes are unchanged from
 * unified-agent CrmEventsService so existing CRM integrations keep working.
 */
let enabled = false;

export function setCrmEventsEnabled(value: boolean) {
  enabled = value;
}

type Payload = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- passthrough of socket payloads

/** Maps a raw socket/app payload to the CRM event name (setEventNameAndData). */
export function crmEventName(e: Payload): { eventName: string; agentData: unknown } | null {
  if (!e || typeof e !== "object") return null;
  if ("agentStateChanged" in e && "mrdStateChanges" in e) {
    if (e.agentStateChanged || (e.mrdStateChanges?.length && e.agentStateChanged === false)) {
      const user = e.agentPresence?.agent?.keycloakUser ?? {};
      return {
        eventName: "AGENT_STATE_CHANGE",
        agentData: { id: user.id, firstName: user.firstName, agentData: e },
      };
    }
    return null;
  }
  if ("keycloak_User" in e) {
    return {
      eventName: "AGENT_LOGIN",
      agentData: { id: e.keycloak_User.id, firstName: e.keycloak_User.firstName, agentData: e.keycloak_User },
    };
  }
  if (e.taskState) return { eventName: "AGENT_TASK_STATE", agentData: e };
  if (e.name === "TASK_STATE_CHANGED" && e.data?.task?.state?.name === "WRAP_UP")
    return { eventName: "AGENT_TASK_STATE", agentData: e };
  if ("topicData" in e) {
    const role = e.topicData?.topicParticipant?.role;
    return {
      eventName:
        role === "SILENT_MONITOR" ? "SILENT_MONITOR" : role === "WHISPER" ? "WHISPER" : "AGENT_TASK_STATE",
      agentData: e,
    };
  }
  if (
    (e.mode === "queue" && "queueName" in e) ||
    (e.mode === "agent" && e.offerToAgent === true && "requestedAgentId" in e)
  ) {
    return { eventName: "TASK_STATE_CHANGED", agentData: e };
  }
  if (e.task === "topicUnsubscription") return { eventName: "END_CONVERSATION", agentData: e };
  if (e.event === "Logout") return { eventName: "LOGOUT", agentData: e };
  if (typeof e.body?.type === "string" && e.body.type.toLowerCase() === "wrapup")
    return { eventName: "WRAPUP", agentData: e };
  if (e.action === "revokeTask") return { eventName: "REVOKE_TASK", agentData: e };
  if (e.action === "whisper") return { eventName: "WHISPER", agentData: e };
  if (e.action === "participantRoleChanged") return { eventName: "PARTICIPANT_ROLE_CHANGED", agentData: e };
  if (e.event === "Channels_Type") return { eventName: "Channels_Type", agentData: e.agentData };
  if (e.event === "Dialog_Ended") return { eventName: "Dialog_Ended", agentData: e.agentData };
  return null;
}

function post(message: unknown, target = "*") {
  if (globalThis.parent === globalThis.window) return; // not embedded
  try {
    globalThis.parent.postMessage(message, target);
  } catch (error) {
    log.warn("postMessage failed", error);
  }
}

export function postCrmEvent(payload: Payload) {
  if (!enabled) return;
  const mapped = crmEventName(payload);
  if (mapped?.agentData) post(mapped);
}

export function postChatSwitching(current: Payload | null, previous: Payload | null) {
  if (!enabled || !current || current.roomInfo === "FAKE_CONVERSATION") return;
  post({
    event: "CHAT_SWITCHING",
    agentData: {
      currentCustomer: { conversationId: current.conversationId, customer: current },
      previousCustomer: { conversationId: previous?.conversationId ?? "", customer: previous },
    },
  });
}

export function postThemeChanged(eventData: unknown) {
  post({ event: "THEME_CHANGED", eventData });
}

export function postConversationData(conversationId: string, data: unknown) {
  if (!enabled) return;
  let origin = "*";
  try {
    origin = globalThis.parent.location.origin; // only readable when same-origin
  } catch {
    /* cross-origin parent: fall back to "*", as the data is meant for the embedding CRM */
  }
  post({ event: "CONVERSATION_DATA", eventData: { conversationId, data } }, origin);
}

/** Incoming `switchConversation` requests from the CRM. */
export function onCrmSwitchConversation(handler: (data: Payload) => void): () => void {
  const listener = (event: MessageEvent) => {
    const action = (event.data as Payload | null)?.action;
    if (typeof action === "string" && action.toLowerCase() === "switchconversation")
      handler(event.data as Payload);
  };
  globalThis.addEventListener("message", listener);
  return () => globalThis.removeEventListener("message", listener);
}
