import { useComposerStore } from "../store/composerStore";
import { usePopoutStore } from "../store/popout";
import { useBoardStore } from "../store/boardStore";
import { resetSeenMessages } from "./seen";
import { transcriptPosition } from "../store/transcriptPosition";
import { toast } from "sonner";
import { getDeskSettings } from "@/core/agent-settings";
import { can, forceEndSession, getSession, onBeforeLogout } from "@/core/auth";
import { postConversationData, postCrmEvent, setCrmEventsEnabled } from "@/core/crm-bridge";
import { t } from "@/core/i18n";
import { createLogger } from "@/core/logging/logger";
import { notify, notifyRealtimeConnected, sounds } from "@/core/notifications";
import { socketManager, useSocketStore } from "@/core/realtime";
import { getCustomerSchema, getPullModeLists, getReasonCodes } from "../api";
import type { Effect } from "../model/cimEvents";
import type { ModelContext, TopicDataPayload } from "../model/conversation";
import { lower } from "../model/systemMessages";
import type { CimEvent, ChannelType } from "../model/types";
import { useAgentStore, type AgentPresence } from "../store/agentStore";
import { getConversation, useConversationStore } from "../store/conversationStore";
import { usePullModeStore } from "../store/pullModeStore";
import { useRequestStore, type PushRequest } from "../store/requestStore";
import { useSchemaStore } from "../store/schemaStore";
import { changeAgentState, publishCimEvent, subscribeTopic, unsubscribeTopic } from "./commands";

const log = createLogger("agent-session");

export interface SessionHooks {
  /** Navigate to the conversations workspace (new conversation, accepted request). */
  openWorkspace(): void;
  /** True when the conversations screen is visible (controls browser notifications). */
  isWorkspaceVisible(): boolean;
}

let hooks: SessionHooks = { openWorkspace: () => {}, isWorkspaceVisible: () => false };
const autoAnswerTimers = new Map<string, ReturnType<typeof setTimeout>>();
let unsubscribers: (() => void)[] = [];
let running = false;
let sessionGeneration = 0;
let loggingOutResolver: (() => void) | null = null;
/**
 * Conversations removed moments ago. Late events for them (delivery receipts, state
 * changes after leaving) are expected and must not raise "conversation not present".
 */
const recentlyRemoved = new Map<string, number>();
const REMOVED_GRACE_MS = 30_000;
function wasRemovedRecently(conversationId: string) {
  const at = recentlyRemoved.get(conversationId);
  if (at === undefined) return false;
  if (Date.now() - at < REMOVED_GRACE_MS) return true;
  recentlyRemoved.delete(conversationId);
  return false;
}

/** The socket dropped after connecting: the next connect is announced as "back online". */
let connectionDropped = false;
let everConnected = false;

function ctx(): ModelContext {
  const user = getSession().user!;
  return {
    agentId: user.id,
    agentUsername: user.username,
    t,
    now: Date.now(),
    channelTypes: useSchemaStore.getState().channelTypes,
  };
}

// ---------------------------------------------------------------------------
// Effects requested by the conversation reducers
// ---------------------------------------------------------------------------

function decodeText(event: CimEvent): string {
  const text = String(event.data?.body?.markdownText ?? "");
  if (!event.data?.header?.additionalData?.isEncoded) return text;
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(text), (c) => c.charCodeAt(0)));
  } catch {
    return text;
  }
}

function runEffects(effects: Effect[]) {
  for (const effect of effects) {
    switch (effect.kind) {
      case "toast":
        toast[effect.variant](effect.message);
        break;
      case "incomingMessage": {
        const conversation = getConversation(effect.conversationId);
        if (!conversation || conversation.hold.active) break;
        sounds.beep();
        // Desktop notification when the agent cannot see the conversation (playSoundAndBrowserNotification).
        if (document.hidden || !hooks.isWorkspaceVisible()) {
          const name = lower(effect.event.name);
          const type = lower(effect.event.data?.body?.type);
          const title = name === "bot_message" ? "BOT" : (conversation.customer.firstName ?? "");
          if (name === "customer_message" || name === "bot_message") {
            void notify(
              title,
              type === "plain" ? decodeText(effect.event) : t("workspace.sent-a-message", { type }),
            );
          }
        }
        break;
      }
      case "crm":
        postCrmEvent(effect.payload as Record<string, unknown>);
        break;
      case "conversationData": {
        const ev = effect.payload as CimEvent;
        postConversationData(String(ev.conversationId), ev.data);
        break;
      }
      case "emitHandRaise": {
        const c = getConversation(effect.conversationId);
        if (c) emitHandRaise(c.conversationId);
        break;
      }
      // whisperCheck / channelSessionEnded / monitoredVoiceEnded / externalGadget are
      // consumed by later phases (supervisor + voice) through the session event bus.
      default:
        sessionBus.dispatchEvent(new CustomEvent(effect.kind, { detail: effect }));
    }
  }
}

/** In-app bus for session events other features react to (voice, supervisor, embedded apps). */
export const sessionBus = new EventTarget();

export function emitHandRaise(conversationId: string) {
  const c = getConversation(conversationId);
  const user = getSession().user;
  if (
    !c ||
    !user ||
    !can("conversations") ||
    c.topicParticipant.role !== "PRIMARY" ||
    c.state !== "ACTIVE" ||
    !socketManager.connected
  )
    return;
  publishCimEvent(c, {
    id: crypto.randomUUID(),
    name: !c.handRaised ? "HAND_RAISED" : "HAND_DOWN",
    type: "NOTIFICATION",
    timestamp: Date.now(),
    conversationId: c.conversationId,
    eventEmitter: {
      id: c.topicParticipant.participant.keycloakUser.id,
      senderName: c.topicParticipant.participant.keycloakUser.username,
      type: "AGENT",
    },
    channelSession: c.firstChannelSession,
    data: { agentId: user.id, userName: user.username },
    roomInfo: c.roomInfo,
  });
}

/**
 * Supervisor role changes from inside a monitored chat (unified-agent
 * moveToWhisperMode / BargeIn). The server answers with participantRoleChanged.
 */
export function canChangeSupervisorRole(
  conversationId: string | null,
  target: "WHISPER" | "BARGE_IN",
): boolean {
  const c = conversationId ? getConversation(conversationId) : undefined;
  if (!c || c.roomInfo === "FAKE_CONVERSATION" || !can("supervisor")) return false;
  const role = c.topicParticipant.role;
  return target === "WHISPER" ? role === "SILENT_MONITOR" : role === "SILENT_MONITOR" || role === "WHISPER";
}

function emitRoleChange(conversationId: string, event: "joinAsWhisper" | "JoinAsBargin") {
  const c = getConversation(conversationId);
  if (!c || !socketManager.connected) return;
  socketManager.emit(event, {
    participantId: c.topicParticipant.participant.id,
    conversationId: c.conversationId,
    roomInfo: c.roomInfo,
  });
}

export function switchToWhisper(conversationId: string) {
  if (canChangeSupervisorRole(conversationId, "WHISPER")) emitRoleChange(conversationId, "joinAsWhisper");
}

export function bargeIntoConversation(conversationId: string) {
  if (canChangeSupervisorRole(conversationId, "BARGE_IN")) emitRoleChange(conversationId, "JoinAsBargin");
}

// ---------------------------------------------------------------------------
// Socket event handlers (unified-agent socketService.subscribeToSocketEvents)
// ---------------------------------------------------------------------------

function onTaskRequest(res: PushRequest & { taskState?: { name: string }; taskDirection?: string }) {
  postCrmEvent(res);
  const direction = lower(res.taskDirection);
  if (lower(res.taskState?.name) === "started") {
    // Already accepted on the server (e.g. consult started): subscribe straight away.
    const role =
      direction === "consult" ? "ASSISTANT" : direction === "silent_monitor" ? "SILENT_MONITOR" : "PRIMARY";
    subscribeTopic(res.conversationId, res.roomInfo, res.taskId, role);
    return;
  }
  if (lower(res.channelSession?.channel?.channelType?.name) === "cx_voice") return; // voice offers come from the SIP layer
  const settings = getDeskSettings();
  if (settings.autoAnswer) {
    const timer = setTimeout(() => {
      subscribeTopic(
        res.conversationId,
        res.roomInfo,
        res.taskId,
        direction === "consult" ? "ASSISTANT" : "PRIMARY",
      );
      autoAnswerTimers.delete(res.conversationId);
    }, settings.autoAnswerDelayMs ?? 0);
    autoAnswerTimers.set(res.conversationId, timer);
    return;
  }
  useRequestStore.getState().addPush(res);
  sounds.ring();
  void notify(
    t("snackbar.CHAT-REQUESTED"),
    `${t("snackbar.Incoming-chat-request-on-push-mode-on")}${res.channelSession?.channel?.channelType?.name ?? ""}`,
  );
}

function onRevokeTask(res: { conversationId: string }) {
  const timer = autoAnswerTimers.get(res.conversationId);
  if (timer) {
    clearTimeout(timer);
    autoAnswerTimers.delete(res.conversationId);
  }
  useRequestStore.getState().removePush(res.conversationId);
  if (!useRequestStore.getState().push.length) sounds.stopRing();
  postCrmEvent({ action: "revokeTask", conversationId: res.conversationId });
}

function onTopicData(res: TopicDataPayload, ack?: (r: { status: string }) => void) {
  postCrmEvent(res as unknown as Record<string, unknown>);
  try {
    const { isNew } = useConversationStore.getState().upsertFromTopicData(res, ctx());
    postConversationData(res.conversationId, res.topicData.conversationData);
    ack?.({ status: "ok" });
    if (isNew) sounds.beep();
    useRequestStore.getState().removePush(res.conversationId);
    useRequestStore.getState().removeHandRaise(res.conversationId);
    if (!useRequestStore.getState().push.length) sounds.stopRing();
    if (getDeskSettings().autoAnswer) toast.success(t("workspace.conversation-accepted"));
    hooks.openWorkspace();
  } catch (error) {
    log.error("onTopicData failed", error);
    toast.error(t("snackbar.Unable-to-process-chat-unsubscribing"));
    unsubscribeTopic({ conversationId: res.conversationId, roomInfo: res.roomInfo });
  }
}

function onCimEvent(res: { cimEvent: string; roomInfo: unknown; conversationId: string }) {
  try {
    const event = JSON.parse(res.cimEvent) as CimEvent;
    const effects = useConversationStore.getState().applyEvent(res.conversationId, event, ctx());
    if (effects === null) {
      if (!wasRemovedRecently(res.conversationId))
        toast.error(t("snackbar.Unable-to-process-event-as-conversation-is-not-present"), {
          id: "event-conversation-missing",
        });
      return;
    }
    runEffects(effects);
  } catch (error) {
    log.error("onCimEvent failed", error);
    toast.error(t("snackbar.Malfunction-event"), { id: "event-malfunction" });
  }
}

function unsubscriptionMessage(reason: string): { variant: "success" | "error"; text: string } | null {
  const upper = reason.toUpperCase();
  if (upper === "CHAT TRANSFERRED")
    return { variant: "success", text: t("snackbar.Transfer-request-placed-successfully") };
  if (upper === "UNSUBSCRIBED")
    return { variant: "success", text: t("snackbar.You-have-left-the-conversation-successfully") };
  if (reason === "choosing leave without Wrap Up")
    return {
      variant: "success",
      text: t("snackbar.No-wrap-ups-added,-you-have-successfully-left-the-conversation"),
    };
  if (upper === "WRAP UP APPLIED")
    return {
      variant: "success",
      text: t("snackbar.The-wrap-up(s)-you-added-are-successfully-applied-to-the-conversation"),
    };
  if (reason === "Wrap Up already applied")
    return { variant: "success", text: t("snackbar.You-have-left-the-conversation-successfully") };
  if (reason.toLowerCase() === "wrap up timer expired")
    return {
      variant: "error",
      text: t("snackbar.Wrap-up-time-expired,-you-are-removed-from-the-conversation"),
    };
  if (reason === "CALLBACK")
    return {
      variant: "success",
      text: t("snackbar.mrd-state-updated-to-callback,-you-are-removed-from-the-conversation"),
    };
  return { variant: "error", text: `${t("snackbar.Conversation-is-closed-due-to")}${reason}` };
}

function onTopicUnsubscription(res: { conversationId: string; reason?: string }) {
  postCrmEvent(res);
  const message = unsubscriptionMessage(res.reason ?? "");
  // One closing message at a time: leaving several conversations replaces, not stacks.
  if (message) toast[message.variant](message.text, { id: "conversation-ended" });
  recentlyRemoved.set(res.conversationId, Date.now());
  const removed = useConversationStore.getState().remove(res.conversationId);
  if (removed) sessionBus.dispatchEvent(new CustomEvent("conversationRemoved", { detail: removed }));
}

function onAgentPresence(res: { agentPresence: AgentPresence }) {
  useAgentStore.getState().setPresence(res.agentPresence);
  postCrmEvent(res);
  if (lower(res.agentPresence?.state?.name) === "logout") {
    if (loggingOutResolver) loggingOutResolver();
    else forceEndSession("forced"); // logged out by a supervisor / another tab
  }
}

function register() {
  const on = socketManager.on.bind(socketManager);
  unsubscribers = [
    on("connect", () => {
      useRequestStore.getState().clearPush();
      // Only a recovery is news; the first connect after sign-in is expected.
      if (connectionDropped) notifyRealtimeConnected();
      connectionDropped = false;
      everConnected = true;
    }),
    on("disconnect", () => {
      if (everConnected) connectionDropped = true;
    }),
    on(
      "connect_error",
      (err: Error & { data?: { content?: { key?: string; licStatus?: string; msg?: string } } }) => {
        useRequestStore.getState().clearPush();
        const content = err.data?.content;
        if (content?.key === "LM" && content.licStatus)
          toast.error(`${t("snackbar.The-license-is")}${content.licStatus}`);
        else toast.error(content?.msg ?? t("snackbar.unable-to-connect-to-chat"));
        if (err.message === "login-failed") forceEndSession("expired");
      },
    ),
    on("disconnect", (reason: string) => {
      if (reason === "io server disconnect") forceEndSession("expired");
    }),
    on("agentPresence", onAgentPresence),
    on("errors", (res: { task?: string; msg?: string }) =>
      toast.error(`${t("snackbar.on")}${res.task ?? ""}: ${res.msg ?? ""}`),
    ),
    on("taskRequest", onTaskRequest),
    on("revokeTask", onRevokeTask),
    on("onCimEvent", onCimEvent),
    on("onTopicData", onTopicData),
    on("topicUnsubscription", onTopicUnsubscription),
    on("wrapupTimerStarted", (res: { conversationId: string; duration: number }) =>
      useConversationStore.getState().showWrapUp(res.conversationId, res.duration, Date.now()),
    ),
    on(
      "consulTransferRequestSuccess",
      (res: {
        conversationId: string;
        newTask?: { id: string; activeMedia?: { id: string; type: { direction: string } }[] };
      }) => {
        const media = res.newTask?.activeMedia?.find((m) => m.type.direction === "CONSULT_TRANSFER");
        if (media && res.newTask)
          useConversationStore.getState().updateTaskId(res.conversationId, `${res.newTask.id}:${media.id}`);
      },
    ),
    on("agentAssistanceRequestPlaced", (res: { requestAction?: string }) => {
      const msg =
        res.requestAction === "transfer"
          ? t("snackbar.Transfer-request-placed-successfully")
          : res.requestAction === "conference"
            ? t("snackbar.Conference-request-placed-successfully")
            : null;
      // The unsubscription that follows a transfer says the same thing; show it once.
      if (msg) setTimeout(() => toast.success(msg, { id: "conversation-ended" }), 1000);
    }),
    on("agentAssignedForAssistance", (res: unknown) =>
      sessionBus.dispatchEvent(new CustomEvent("namedAssistance", { detail: res })),
    ),
    on("socketSessionRemoved", () => {
      forceEndSession("another-session");
      globalThis.alert(t("snackbar.you-are-logged-In-from-another-session"));
    }),
    on(
      "HandRaiseNotification",
      (res: { cimEvent?: string | Record<string, unknown>; conversationId?: string }) => {
        const evt = typeof res.cimEvent === "string" ? JSON.parse(res.cimEvent) : res.cimEvent;
        const id = res.conversationId ?? evt?.conversationId ?? evt?.channelSession?.conversationId;
        if (!id || getConversation(id)) return;
        useRequestStore
          .getState()
          .addHandRaise({ id, event: { ...evt, conversationId: id }, agentName: evt?.data?.userName });
        sounds.ring();
      },
    ),
    on("HandDownNotification", (res: { cimEvent?: string }) => {
      try {
        const evt = typeof res.cimEvent === "string" ? JSON.parse(res.cimEvent) : res.cimEvent;
        if (evt?.conversationId) useRequestStore.getState().removeHandRaise(evt.conversationId);
        sounds.stopRing();
      } catch {
        /* malformed: ignore */
      }
    }),
    on("onChannelTypes", (types: ChannelType[]) => {
      useSchemaStore.getState().setChannelTypes(types);
      postCrmEvent({ event: "Channels_Type", agentData: types });
    }),
    on("onPullModeSubscribedList", (list: unknown[]) => usePullModeStore.getState().setSubscribed(list)),
    on("onPullModeSubscribedListRequest", (res: { pullModeEvent: string; type: string }) => {
      try {
        const request = JSON.parse(res.pullModeEvent);
        const outcome = usePullModeStore.getState().upsertRequest(request, res.type);
        if (outcome === "opened") {
          useRequestStore.getState().addPull(request);
          sounds.ring();
          const listName = usePullModeStore.getState().listNames[request.listId] ?? "";
          void notify(
            t("snackbar.CHAT-REQUESTED"),
            `${t("snackbar.Incoming-chat-request-on-pull-mode-on")}${listName}`,
          );
        } else if (outcome === "closed") {
          useRequestStore.getState().removePull(request.id);
          sounds.stopRing();
        }
      } catch (error) {
        log.error("pull mode request", error);
      }
    }),
    on("pullModeSubscribedListRequests", (reqs: never[]) => usePullModeStore.getState().setRequests(reqs)),
    on("addPullModeSubscribedListRequests", (reqs: never[]) => usePullModeStore.getState().addRequests(reqs)),
    on("removePullModeSubscribedListRequests", (listId: string) =>
      usePullModeStore.getState().removeRequestsOfList(listId),
    ),
  ];
}

async function preload(version: number) {
  const results = await Promise.allSettled([getReasonCodes(), getCustomerSchema(), getPullModeLists()]);
  if (!running || version !== sessionGeneration) return;
  if (results[0].status === "fulfilled") useAgentStore.getState().setReasonCodes(results[0].value ?? []);
  if (results[1].status === "fulfilled") useSchemaStore.getState().setSchema(results[1].value);
  if (results[2].status === "fulfilled") usePullModeStore.getState().setLists(results[2].value ?? []);
  results
    .filter((r) => r.status === "rejected")
    .forEach((r) => log.warn("preload failed", (r as PromiseRejectedResult).reason));
}

let removeLogoutHook: (() => void) | null = null;

/**
 * Starts the agent session (socket + state). Only for agent/supervisor users;
 * admin-only and VRS-only users never appear as logged-in agents.
 */
export function startAgentSession(sessionHooks: SessionHooks, fcmKey: string | null) {
  if (running) return;
  const user = getSession().user;
  if (!user || !can("agentSession")) return;
  running = true;
  connectionDropped = false;
  everConnected = false;
  useAgentStore.getState().markLogin();
  const version = ++sessionGeneration;
  hooks = sessionHooks;
  setCrmEventsEnabled(getDeskSettings().crmEvents);
  register();
  socketManager.connect(user, { desktopFcmKey: null, mobileFcmKey: fcmKey });
  void preload(version);

  // Logout: tell agent-manager first (LOGOUT agent state with reason), wait for the
  // LOGOUT presence (or a short timeout), then let auth clear the session.
  removeLogoutHook = onBeforeLogout(async (reason) => {
    if (!socketManager.connected) return;
    await new Promise<void>((resolve) => {
      loggingOutResolver = resolve;
      changeAgentState({ name: "LOGOUT", flag: "header", reasonCode: reason ?? DEFAULT_LOGOUT_REASON });
      setTimeout(resolve, 3000);
    });
    loggingOutResolver = null;
  });
}

export function stopAgentSession() {
  resetSeenMessages();
  transcriptPosition.reset();
  if (!running) return;
  running = false;
  sessionGeneration++;
  recentlyRemoved.clear();
  usePopoutStore.getState().closeAll();
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
  autoAnswerTimers.forEach((timer) => clearTimeout(timer));
  autoAnswerTimers.clear();
  removeLogoutHook?.();
  removeLogoutHook = null;
  socketManager.disconnect();
  sounds.stopRing();
  useComposerStore.getState().reset();
  useBoardStore.getState().reset();
  useConversationStore.getState().reset();
  useAgentStore.getState().reset();
  useRequestStore.getState().reset();
  usePullModeStore.getState().reset();
  useSchemaStore.getState().reset();
  useSocketStore.setState({ status: "idle", lastError: null });
}

/** Default logout reason when none is chosen (app-header logout()). */
export const DEFAULT_LOGOUT_REASON = {
  name: "Default logout",
  description: "Default logout with no reason",
  type: "LOGOUT",
  code: 8,
  id: "62ffc95cf12b6ccf1594d991",
};
