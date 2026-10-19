import { toast } from "sonner";
import { getFileDownloadBaseUrl } from "@/config";
import { can, getSession } from "@/core/auth";
import { t } from "@/core/i18n";
import { socketManager } from "@/core/realtime";
import { uploadFile } from "../api";
import {
  ALLOWED_EXTENSIONS,
  buildMediaMessage,
  buildTextMessage,
  buildWrapUpMessage,
  cleanSession,
  newAgentMessage,
  selectedSession,
  toCimEvent,
  type WrapUpSelection,
} from "../model/outgoing";
import type { CimMessage, Conversation } from "../model/types";
import { validEmailRecipients, type EmailPayload, type EmailAttachment } from "../model/email";
import { getConversation, useConversationStore } from "../store/conversationStore";
import { emitHandRaise } from "./agentSession";
import { publishCimEvent, unsubscribeTopic } from "./commands";
import {
  attachCommentContext,
  attachCommentEditContext,
  mayActOnComment,
  mayEditMessage,
  originalChannelSession,
} from "../model/social";

function ensureConnected(): boolean {
  if (socketManager.connected) return true;
  toast.error(t("snackbar.Unable-to-send-the-message-at-the-moment"));
  return false;
}

export function mayCompose(
  conversation: Conversation,
  options: { whisper?: boolean; originalMessageId?: string | null } = {},
): boolean {
  if (
    !can("conversations") ||
    !getSession().user ||
    getSession().user?.id !== conversation.topicParticipant.participant.keycloakUser.id ||
    conversation.state !== "ACTIVE" ||
    !conversation.composerEnabled ||
    conversation.hold.active ||
    conversation.wrapUp.show
  )
    return false;
  const role = conversation.topicParticipant.role;
  if (role === "SILENT_MONITOR") return false;
  if (role === "ASSISTANT" && !options.whisper) return false;
  if (["WHISPER", "ASSISTANT"].includes(role) && conversation.agentParticipants.length === 0) return false;
  const session = selectedSession(conversation);
  if (!session || session.isDisabled) return false;
  if (
    ["youtube", "linkedin", "play_store", "apple_store"].includes(
      session.channel.channelType.name.toLowerCase(),
    ) &&
    !options.originalMessageId
  )
    return false;
  return true;
}

export interface SendOptions {
  sessionId?: string;
  signal?: AbortSignal;
  privateReply?: boolean;
  whisper?: boolean;
  originalMessageId?: string | null;
  intent?: "UPDATE" | "REPLY_TO" | "REPLY_ALL" | "FORWARD" | null;
  email?: EmailPayload;
}

function pinnedConversation(conversationId: string, sessionId?: string) {
  const conversation = getConversation(conversationId);
  if (!conversation || !sessionId) return conversation;
  return {
    ...conversation,
    activeChannelSessions: conversation.activeChannelSessions.map((session) => ({
      ...session,
      isChecked: session.id === sessionId,
    })),
  };
}

/** Sends a text message on the selected channel session (constructAndSendCimEvent "plain"). */
export function sendText(conversationId: string, text: string, options: SendOptions = {}): boolean {
  if (options.signal?.aborted) return false;
  const conversation = pinnedConversation(conversationId, options.sessionId);
  const original = conversation?.messages.find((m) => m.id === options.originalMessageId);
  if (options.intent === "UPDATE") {
    if (
      !conversation ||
      !original ||
      !mayEditMessage(conversation, original, selectedSession(conversation) ?? undefined)
    )
      return false;
    options = { ...options, whisper: Boolean(original.body.isWhisper), privateReply: false };
  }
  if (
    !conversation ||
    !mayCompose(conversation, options) ||
    (!text.trim() && !options.email?.attachments?.length) ||
    !ensureConnected()
  )
    return false;
  if (
    options.email &&
    (!validEmailRecipients(options.email.to) ||
      Boolean(options.email.cc && !validEmailRecipients(options.email.cc)) ||
      Boolean(options.email.bcc && !validEmailRecipients(options.email.bcc)))
  ) {
    toast.error("Enter valid email recipients.");
    return false;
  }
  const session = selectedSession(conversation);
  if (!session) {
    toast.error(t("snackbar.No-channel-session-selected-at-the-moment"));
    return false;
  }
  const message = buildTextMessage(conversation, session, text, options);
  if (original?.body.type.toLowerCase() === "comment" && options.intent === "UPDATE")
    attachCommentEditContext(message, original);
  if (original?.body.type.toLowerCase() === "comment" && !options.whisper && options.intent !== "UPDATE") {
    if (
      originalChannelSession(conversation, original)?.id !== session.id ||
      !mayActOnComment(original, session, options.privateReply ? "private" : "reply")
    )
      return false;
    attachCommentContext(message, original, options.privateReply);
  }
  const { cimEvent, local } = toCimEvent(
    options.whisper ? "WHISPER_MESSAGE" : "AGENT_MESSAGE",
    conversation,
    message,
  );
  publishCimEvent(conversation, cimEvent);
  if (local) useConversationStore.getState().addLocalMessage(conversationId, local);
  return true;
}

/** Upload email attachments together, then dispatch one EMAIL event to the pinned session. */
export async function sendEmail(
  conversationId: string,
  text: string,
  email: EmailPayload,
  files: File[],
  options: SendOptions = {},
) {
  if (options.signal?.aborted) return false;
  const owner = getSession().user?.id;
  const conversation = pinnedConversation(conversationId, options.sessionId);
  const session = conversation ? selectedSession(conversation) : null;
  if (
    !conversation ||
    !session ||
    session.channel.channelType.name.toLowerCase() !== "email" ||
    !mayCompose(conversation, options) ||
    !ensureConnected()
  )
    return false;
  if (
    !validEmailRecipients(email.to) ||
    (email.cc && !validEmailRecipients(email.cc)) ||
    (email.bcc && !validEmailRecipients(email.bcc))
  ) {
    toast.error("Enter valid email recipients.");
    return false;
  }
  if (files.some((file) => !ALLOWED_EXTENSIONS.includes(file.name.split(".").pop()?.toLowerCase() ?? ""))) {
    toast.error("An email attachment has an unsupported file type.");
    return false;
  }
  const attachments: EmailAttachment[] = [...(email.attachments ?? [])];
  try {
    const htmlDocument = new DOMParser().parseFromString(email.htmlBody, "text/html");
    const inlineUploads = new Map<string, { name: string; url: string }>();
    for (const image of htmlDocument.body.querySelectorAll("img[data-inline-id]")) {
      const id = image.getAttribute("data-inline-id")!;
      const item = email.inlineImages?.find((candidate) => candidate.id === id);
      if (!item) throw new Error("An inline image is missing from this draft.");
      let result = inlineUploads.get(id);
      if (!result) {
        const form = new FormData();
        form.append("conversationId", conversationId);
        form.append("file", item.file);
        const uploaded = await uploadFile(form);
        if (getSession().user?.id !== owner || options.signal?.aborted) return false;
        result = {
          name: uploaded.name,
          url: `${getFileDownloadBaseUrl()}/api/downloadFileStream?filename=${encodeURIComponent(uploaded.name)}`,
        };
        inlineUploads.set(id, result);
      }
      image.setAttribute("src", result.url);
      image.setAttribute("data-cid", result.name);
      image.removeAttribute("data-inline-id");
    }
    if (
      [...htmlDocument.body.querySelectorAll("img")].some((image) =>
        image.getAttribute("src")?.startsWith("blob:"),
      )
    )
      throw new Error("An inline image could not be uploaded.");
    const htmlBody = htmlDocument.body.innerHTML;
    for (const file of files) {
      const form = new FormData();
      form.append("conversationId", conversationId);
      form.append("roomInfo", String(Math.floor(Math.random() * 90000) + 10000));
      form.append("file", file);
      const uploaded = await uploadFile(form);
      if (getSession().user?.id !== owner || options.signal?.aborted) return false;
      attachments.push({
        mediaLabel: file.name,
        mediaName: uploaded.name,
        mediaUrl: `${getFileDownloadBaseUrl()}/api/downloadFileStream?filename=${encodeURIComponent(uploaded.name)}`,
        mimeType: uploaded.type,
        size: uploaded.size,
        thumbnail: "",
      });
    }
    const latest = getConversation(conversationId);
    const pinned = latest
      ? {
          ...latest,
          activeChannelSessions: latest.activeChannelSessions.map((s) => ({
            ...s,
            isChecked: s.id === session.id,
          })),
        }
      : null;
    if (
      getSession().user?.id !== owner ||
      options.signal?.aborted ||
      !latest ||
      !pinned ||
      !mayCompose(pinned, options) ||
      !ensureConnected() ||
      !latest.activeChannelSessions.some((s) => s.id === session.id && !s.isDisabled)
    )
      return false;
    const message = buildTextMessage(latest, session, text, {
      ...options,
      email: { ...email, htmlBody, attachments },
    });
    const { cimEvent, local } = toCimEvent("AGENT_MESSAGE", latest, message);
    publishCimEvent(latest, cimEvent);
    if (local) useConversationStore.getState().addLocalMessage(conversationId, local);
    return true;
  } catch (error) {
    toast.error(`Email could not be sent: ${(error as Error).message}`);
    return false;
  }
}

/** Re-publishes a failed local message (UA failed-message retry). */
export function retryFailedMessage(conversationId: string, message: CimMessage): boolean {
  const conversation = getConversation(conversationId);
  if (
    !conversation ||
    !mayCompose(conversation, {
      whisper: Boolean(message.body.isWhisper),
      originalMessageId: message.header.originalMessageId,
    }) ||
    !ensureConnected()
  )
    return false;
  const next = structuredClone(message);
  next.header.status = "sending";
  next.header.timestamp = Date.now();
  const name = next.body.isWhisper ? "WHISPER_MESSAGE" : "AGENT_MESSAGE";
  const { cimEvent } = toCimEvent(name, conversation, next, { keepLocal: false });
  publishCimEvent(conversation, cimEvent);
  useConversationStore.setState((state) => {
    const row = state.byId[conversationId];
    if (!row) return state;
    return {
      ...state,
      byId: {
        ...state.byId,
        [conversationId]: {
          ...row,
          messages: row.messages.map((item) => (item.id === message.id ? next : item)),
        },
      },
    };
  });
  return true;
}

const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Throttled TYPING_INDICATOR / TYPING_STARTED (UA sendTypingEvent). */
export function sendTyping(conversationId: string, whisper = false) {
  if (typingTimers.has(conversationId) || whisper) return;
  const conversation = getConversation(conversationId);
  if (!conversation || !mayCompose(conversation) || !socketManager.connected) return;
  const role = conversation.topicParticipant.role.toLowerCase();
  if (role === "silent_monitor" || role === "assistant") return;
  const session = selectedSession(conversation);
  if (!session) return;
  const message = newAgentMessage(conversation);
  const clean = cleanSession(session);
  message.header.channelSession = clean;
  message.header.channelData = clean.channelData;
  message.body.type = "NOTIFICATION";
  message.body.notificationType = "TYPING_STARTED";
  publishCimEvent(conversation, {
    id: crypto.randomUUID(),
    name: "TYPING_INDICATOR",
    type: "NOTIFICATION",
    conversationId: conversation.conversationId,
    roomInfo: conversation.roomInfo,
    timestamp: Date.now(),
    data: message,
    eventEmitter: message.header.sender,
    channelSession: clean,
  });
  typingTimers.set(
    conversationId,
    setTimeout(() => {
      typingTimers.delete(conversationId);
    }, 3000),
  );
}

/** Like / hide / unhide / delete on social comments (UA constructAndSendCommentAction). */
export function sendCommentAction(
  conversationId: string,
  message: CimMessage,
  action: "like" | "hide" | "unhide" | "delete",
) {
  const conversation = getConversation(conversationId);
  if (!conversation || !ensureConnected()) return;
  const session = originalChannelSession(conversation, message);
  if (
    !session ||
    !mayActOnComment(message, session, action) ||
    !mayCompose(
      {
        ...conversation,
        activeChannelSessions: conversation.activeChannelSessions.map((s) => ({
          ...s,
          isChecked: s.id === session.id,
        })),
      },
      { originalMessageId: message.id },
    )
  )
    return;
  const clean = cleanSession(session);
  const payload = newAgentMessage(conversation);
  payload.header.providerMessageId = message.header.providerMessageId;
  payload.header.originalMessageId = message.id;
  payload.header.channelSession = clean;
  payload.header.channelData = clean.channelData;
  payload.body.type = "COMMENT";
  payload.body.postId = message.body.postId;
  let item = action;
  if (action === "unhide") {
    payload.header.additionalData = { isHidden: false };
    item = "hide";
  } else if (action === "hide") {
    payload.header.additionalData = { isHidden: true };
  }
  payload.body.itemType = item.toUpperCase();
  const { cimEvent } = toCimEvent("AGENT_MESSAGE", conversation, payload, { keepLocal: false });
  publishCimEvent(conversation, cimEvent);
}

/** Uploads files to the file engine and sends each as a media message. */
export async function sendFiles(
  conversationId: string,
  files: File[],
  options: SendOptions = {},
): Promise<File[]> {
  const sent: File[] = [];
  if (options.signal?.aborted) return sent;
  const owner = getSession().user?.id;
  const conversation = pinnedConversation(conversationId, options.sessionId);
  if (!conversation || !mayCompose(conversation, options) || !ensureConnected()) return sent;
  const session = selectedSession(conversation);
  if (!session) {
    toast.error(t("snackbar.No-channel-session-selected-at-the-moment"));
    return sent;
  }
  const original = conversation.messages.find((m) => m.id === options.originalMessageId);
  const commentReply = original?.body.type.toLowerCase() === "comment" && !options.whisper;
  if (
    commentReply &&
    (options.privateReply ||
      session.channel.channelType.name.toLowerCase() === "instagram" ||
      !mayActOnComment(original!, session, "reply"))
  ) {
    toast.error("Attachments are unavailable for this comment reply.");
    return sent;
  }
  for (const file of files) {
    if (options.signal?.aborted || getSession().user?.id !== owner) return sent;
    if (commentReply && !["image", "video"].includes(file.type.split("/")[0]!)) {
      toast.error("Comment replies support image and video attachments.");
      continue;
    }
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
      const pinned = latest
        ? {
            ...latest,
            activeChannelSessions: latest.activeChannelSessions.map((s) => ({
              ...s,
              isChecked: s.id === session.id,
            })),
          }
        : null;
      if (
        getSession().user?.id !== owner ||
        options.signal?.aborted ||
        !latest ||
        !pinned ||
        !mayCompose(pinned, options) ||
        !ensureConnected() ||
        !latest.activeChannelSessions.some((s) => s.id === session.id && !s.isDisabled)
      )
        return sent;
      const latestOriginal = latest.messages.find((m) => m.id === original?.id);
      const latestSession = latest.activeChannelSessions.find((s) => s.id === session.id)!;
      if (
        commentReply &&
        (!latestOriginal ||
          originalChannelSession(latest, latestOriginal)?.id !== session.id ||
          !mayActOnComment(latestOriginal, latestSession, "reply"))
      )
        return sent;
      const message = buildMediaMessage(latest, session, uploaded, getFileDownloadBaseUrl());
      if (commentReply && latestOriginal) attachCommentContext(message, latestOriginal);
      const { cimEvent, local } = toCimEvent(
        options.whisper ? "WHISPER_MESSAGE" : "AGENT_MESSAGE",
        latest,
        message,
      );
      publishCimEvent(latest, cimEvent);
      sent.push(file);
      if (local) useConversationStore.getState().addLocalMessage(conversationId, local);
    } catch (error) {
      toast.error(
        `${t("workspace.upload-failed", { name: file.name })} ${(error as Error).message ?? ""}`.trim(),
      );
    }
  }
  return sent;
}

/**
 * Applies wrap-up codes. During the conversation it is a normal WRAPUP agent
 * message; once the server started the wrap-up timer (after leaving), it goes
 * through `closeWrapup` so agent-manager can release the agent (closeWrapDialog).
 */
export function submitWrapUp(conversationId: string, wrapups: WrapUpSelection[], note: string) {
  const conversation = getConversation(conversationId);
  if (!conversation || !ensureConnected()) return;
  if (!can("wrapUp") || conversation.topicParticipant.role === "SILENT_MONITOR") return;
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
  if (!conversation?.wrapUp.show || !can("wrapUp") || !ensureConnected()) return;
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
  if (
    !conversation ||
    !can("conversations") ||
    conversation.topicParticipant.role !== "PRIMARY" ||
    conversation.state !== "ACTIVE" ||
    conversation.hold.active ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    !ensureConnected()
  )
    return;
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
  if (
    !conversation ||
    !can("conversations") ||
    conversation.topicParticipant.role !== "PRIMARY" ||
    !conversation.hold.active ||
    !ensureConnected()
  )
    return;
  socketManager.emit("resumeConversation", {
    participantId: conversation.topicParticipant.participant.id,
    conversationId: conversation.conversationId,
    roomInfo: conversation.roomInfo,
    state: "ACTIVE",
  });
}

/** Opens the wrap-up panel for a conversation, starting its timer now. */
export function openWrapUp(conversationId: string, seconds: number) {
  useConversationStore.getState().showWrapUp(conversationId, seconds, Date.now());
}

/**
 * Leaves a conversation (unsubscribeFromConversation / topicUnsub). Raised hands
 * are lowered first so supervisors stop seeing the request.
 */
export function leaveConversation(conversationId: string) {
  const conversation = getConversation(conversationId);
  if (!conversation) return;
  if (conversation.state === "ACTIVE" && (!can("leaveChat") || !ensureConnected())) return;
  if (conversation.handRaised) emitHandRaise(conversationId);
  if (conversation.state === "ACTIVE") unsubscribeTopic(conversation);
  else useConversationStore.getState().remove(conversationId);
}
