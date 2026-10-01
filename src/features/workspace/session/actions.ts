import { toast } from "sonner";
import { getFileDownloadBaseUrl } from "@/config";
import { getSession } from "@/core/auth";
import { t } from "@/core/i18n";
import { socketManager } from "@/core/realtime";
import { uploadFile } from "../api";
import {
  ALLOWED_EXTENSIONS,
  buildMediaMessage,
  buildTextMessage,
  buildWrapUpMessage,
  isSocialSession,
  selectedSession,
  toCimEvent,
  type WrapUpSelection,
} from "../model/outgoing";
import { getConversation, useConversationStore } from "../store/conversationStore";
import { emitHandRaise } from "./agentSession";
import { publishCimEvent, unsubscribeTopic } from "./commands";

function ensureConnected(): boolean {
  if (socketManager.connected) return true;
  toast.error(t("snackbar.Unable-to-send-the-message-at-the-moment"));
  return false;
}

export interface SendOptions {
  whisper?: boolean;
  originalMessageId?: string | null;
  intent?: "UPDATE" | "REPLY_TO" | null;
}

/** Sends a text message on the selected channel session (constructAndSendCimEvent "plain"). */
export function sendText(conversationId: string, text: string, options: SendOptions = {}): boolean {
  const conversation = getConversation(conversationId);
  if (!conversation || !text.trim() || !ensureConnected()) return false;
  const session = selectedSession(conversation);
  if (!session) {
    toast.error(t("snackbar.No-channel-session-selected-at-the-moment"));
    return false;
  }
  if (isSocialSession(session) && options.originalMessageId && options.intent === "REPLY_TO") {
    // Comment replies are built by the social message renderer (Phase 4).
    return false;
  }
  const message = buildTextMessage(conversation, session, text, options);
  const { cimEvent, local } = toCimEvent(
    options.whisper ? "WHISPER_MESSAGE" : "AGENT_MESSAGE",
    conversation,
    message,
  );
  publishCimEvent(conversation, cimEvent);
  if (local) useConversationStore.getState().addLocalMessage(conversationId, local);
  return true;
}

/** Uploads files to the file engine and sends each as a media message. */
export async function sendFiles(
  conversationId: string,
  files: File[],
  options: SendOptions = {},
): Promise<void> {
  const conversation = getConversation(conversationId);
  if (!conversation || !ensureConnected()) return;
  const session = selectedSession(conversation);
  if (!session) {
    toast.error(t("snackbar.No-channel-session-selected-at-the-moment"));
    return;
  }
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`${file.name}${t("snackbar.unsupported-type")}`);
      continue;
    }
    const form = new FormData();
    form.append("roomInfo", String(Math.floor(Math.random() * 90000) + 10000));
    form.append("conversationId", conversationId);
    form.append("file", file);
    try {
      const uploaded = await uploadFile(form);
      const latest = getConversation(conversationId);
      if (!latest) return;
      const message = buildMediaMessage(
        latest,
        selectedSession(latest) ?? session,
        uploaded,
        getFileDownloadBaseUrl(),
      );
      const { cimEvent, local } = toCimEvent(
        options.whisper ? "WHISPER_MESSAGE" : "AGENT_MESSAGE",
        latest,
        message,
      );
      publishCimEvent(latest, cimEvent);
      if (local) useConversationStore.getState().addLocalMessage(conversationId, local);
    } catch (error) {
      toast.error(
        `${t("workspace.upload-failed", { name: file.name })} ${(error as Error).message ?? ""}`.trim(),
      );
    }
  }
}

/**
 * Applies wrap-up codes. During the conversation it is a normal WRAPUP agent
 * message; once the server started the wrap-up timer (after leaving), it goes
 * through `closeWrapup` so agent-manager can release the agent (closeWrapDialog).
 */
export function submitWrapUp(conversationId: string, wrapups: WrapUpSelection[], note: string) {
  const conversation = getConversation(conversationId);
  if (!conversation || !ensureConnected()) return;
  const message = buildWrapUpMessage(conversation, wrapups, note);
  const { cimEvent, local } = toCimEvent("AGENT_MESSAGE", conversation, message, {
    keepLocal: !conversation.wrapUp.show,
  });
  if (conversation.wrapUp.show) {
    socketManager.emit("closeWrapup", {
      cimEvent,
      roomInfo: conversation.roomInfo,
      conversationId,
      agentId: getSession().user!.id,
    });
    useConversationStore.getState().hideWrapUp(conversationId);
  } else {
    publishCimEvent(conversation, cimEvent);
    if (local) useConversationStore.getState().addLocalMessage(conversationId, local);
  }
}

/** Closes the post-conversation wrap-up without codes. */
export function skipWrapUp(conversationId: string) {
  const conversation = getConversation(conversationId);
  if (!conversation?.wrapUp.show) return;
  socketManager.emit("closeWrapup", {
    cimEvent: null,
    isWrapUpAlreadyApplied: conversation.appliedWrapUps.length > 0,
    roomInfo: conversation.roomInfo,
    conversationId,
    agentId: getSession().user!.id,
  });
  useConversationStore.getState().hideWrapUp(conversationId);
}

/** Pauses a chat for `durationSeconds` (unified-agent pauseConversation; spans are minutes × 60). */
export function pauseConversation(conversationId: string, durationSeconds: number) {
  const conversation = getConversation(conversationId);
  if (!conversation || !ensureConnected()) return;
  socketManager.emit("pauseConversation", {
    participantId: conversation.topicParticipant.participant.id,
    conversationId: conversation.conversationId,
    roomInfo: conversation.roomInfo,
    duration: durationSeconds,
    state: "ON_HOLD",
  });
}

/** Resumes a paused chat (unified-agent resumeConversation). */
export function resumeConversation(conversationId: string) {
  const conversation = getConversation(conversationId);
  if (!conversation || !ensureConnected()) return;
  socketManager.emit("resumeConversation", {
    participantId: conversation.topicParticipant.participant.id,
    conversationId: conversation.conversationId,
    roomInfo: conversation.roomInfo,
    state: "ACTIVE",
  });
}

/**
 * Leaves a conversation (unsubscribeFromConversation / topicUnsub). Raised hands
 * are lowered first so supervisors stop seeing the request.
 */
export function leaveConversation(conversationId: string) {
  const conversation = getConversation(conversationId);
  if (!conversation) return;
  if (conversation.handRaised) emitHandRaise(conversationId);
  if (conversation.state === "ACTIVE") unsubscribeTopic(conversation);
  else useConversationStore.getState().remove(conversationId);
}
