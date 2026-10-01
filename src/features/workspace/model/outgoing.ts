import type { ChannelSession, CimMessage, Conversation } from "./types";

/** UTF-8 safe base64 (Buffer.from(text, "utf-8").toString("base64") in unified-agent). */
export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Decodes agent-encoded text and un-escapes the HTML entities the old app produced. */
export function decodeBase64(base64: string): string {
  try {
    const binary = atob(base64);
    const text = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
    return text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#x2F;/g, "/")
      .replace(/&#x60;/g, "`")
      .replace(/&amp;/g, "&");
  } catch {
    return "";
  }
}

/** Plain text of a message for display (handles isEncoded). */
export function messageText(message: Pick<CimMessage, "header" | "body">): string {
  const text = String(message.body.markdownText ?? "");
  return (message.header.additionalData as { isEncoded?: boolean } | undefined)?.isEncoded
    ? decodeBase64(text)
    : text;
}

/** Channel session without UI-only flags, as sent to the server. */
export function cleanSession(session: ChannelSession): ChannelSession {
  const copy = structuredClone(session) as ChannelSession;
  delete copy.webChannelData;
  delete copy.isChecked;
  delete copy.isDisabled;
  return copy;
}

/** Empty agent message with sender filled in (getCimMessage). */
export function newAgentMessage(conversation: Conversation): CimMessage {
  const user = conversation.topicParticipant.participant.keycloakUser;
  return {
    id: crypto.randomUUID(),
    header: {
      timestamp: Date.now(),
      sender: {
        id: user.id,
        senderName: user.username,
        type: "AGENT",
        additionalDetail: { firstName: user.firstName, lastName: user.lastName },
      },
      channelSession: {},
      channelData: {},
      intent: null,
    },
    body: { markdownText: "", type: "" },
  };
}

export interface OutgoingEvent {
  /** Payload for publishCimEvent. */
  cimEvent: Record<string, unknown>;
  /** Optimistic local copy to show immediately (null for edits / actions). */
  local: CimMessage | null;
}

/**
 * Wraps a message as a CIM event (unified-agent CimEvent class + emitCimEvent):
 * conversation/room/session ids and the customer go into the header, the channel
 * session moves to the event, and the sender becomes the event emitter.
 */
export function toCimEvent(
  name: "AGENT_MESSAGE" | "WHISPER_MESSAGE",
  conversation: Conversation,
  message: CimMessage,
  options: { keepLocal?: boolean } = {},
): OutgoingEvent {
  const data = structuredClone(message);
  const channelSession = data.header.channelSession as ChannelSession | undefined;
  data.header.conversationId = conversation.conversationId;
  data.header.roomId = (conversation.roomInfo as { id?: string } | null)?.id;
  data.header.channelSessionId = channelSession?.id;
  data.header.customer = conversation.customer;
  delete data.header.channelSession;

  const cimEvent = {
    id: crypto.randomUUID(),
    name,
    type: "MESSAGE",
    conversationId: conversation.conversationId,
    roomInfo: conversation.roomInfo,
    timestamp: Date.now(),
    data,
    eventEmitter: data.header.sender,
    channelSession,
  };

  let local: CimMessage | null = null;
  if (options.keepLocal !== false && message.header.intent !== "UPDATE") {
    local = structuredClone(message);
    local.header.status = "sending";
    local.body.isWhisper = name === "WHISPER_MESSAGE";
    local.header.channelSession = channelSession;
  }
  return { cimEvent, local };
}

export function selectedSession(conversation: Conversation): ChannelSession | null {
  return conversation.activeChannelSessions.find((s) => s.isChecked) ?? null;
}

const SOCIAL = ["facebook", "instagram", "twitter", "youtube", "linkedin", "play_store", "apple_store"];
export const isSocialSession = (s: ChannelSession | null) =>
  Boolean(s && SOCIAL.includes(s.channel.channelType.name.toLowerCase()));

/** Plain / URL text message on the selected channel session. */
export function buildTextMessage(
  conversation: Conversation,
  session: ChannelSession,
  text: string,
  options: {
    originalMessageId?: string | null;
    intent?: string | null;
    url?: string;
    secureLink?: boolean;
  } = {},
): CimMessage {
  const message = newAgentMessage(conversation);
  if (options.originalMessageId) {
    message.header.intent = options.intent ?? null;
    message.header.originalMessageId = options.originalMessageId;
  }
  const clean = cleanSession(session);
  message.header.channelSession = clean;
  message.header.channelData = clean.channelData;
  message.body.markdownText = encodeBase64(text.trim());
  message.header.additionalData = {
    isEncoded: true,
    ...(options.secureLink ? { secureWebRTCLink: true } : {}),
  };
  if (options.url) {
    message.body.type = "URL";
    message.body.mediaUrl = options.url;
  } else {
    message.body.type = "PLAIN";
  }
  return message;
}

/** File / image / video / audio attachment message (after upload to the file engine). */
export function buildMediaMessage(
  conversation: Conversation,
  session: ChannelSession,
  file: { name: string; type: string; size: number },
  downloadBaseUrl: string,
): CimMessage {
  const message = newAgentMessage(conversation);
  const clean = cleanSession(session);
  message.header.channelSession = clean;
  message.header.channelData = clean.channelData;
  const kind = file.type.split("/")[0]?.toLowerCase() ?? "application";
  message.body.attachment = {
    mediaUrl: `${downloadBaseUrl}/api/downloadFileStream?filename=${file.name}`,
    mimeType: file.type,
    size: file.size,
    thumbnail: "",
  };
  if (kind === "application" || kind === "text") {
    message.body.type = "FILE";
    message.body.caption = "";
    message.body.additionalDetails = { fileName: file.name };
  } else {
    message.body.type = kind.toUpperCase();
    message.body.caption = file.name;
    message.body.additionalDetails = {};
  }
  return message;
}

export interface WrapUpSelection {
  categoryName: string;
  value: string;
}

/** WRAPUP agent message on the conversation's first channel session (constructWrapUpEvent). */
export function buildWrapUpMessage(
  conversation: Conversation,
  wrapups: WrapUpSelection[],
  note: string,
): CimMessage {
  const message = newAgentMessage(conversation);
  const session = conversation.firstChannelSession
    ? cleanSession(conversation.firstChannelSession)
    : undefined;
  message.body.type = "WRAPUP";
  message.body.markdownText = "";
  message.body.wrapups = wrapups;
  message.body.note = note;
  message.header.channelSession = session;
  message.header.channelData = session?.channelData;
  return message;
}

/** Allowed attachment extensions (uploadFileAndConstructAndSendEvent). */
export const ALLOWED_EXTENSIONS = [
  "txt",
  "png",
  "jpg",
  "svg",
  "css",
  "oga",
  "mpga",
  "gif",
  "csv",
  "webp",
  "jpeg",
  "pdf",
  "ppt",
  "pptx",
  "xlsx",
  "xls",
  "doc",
  "docx",
  "mp4",
  "mp3",
  "eml",
];

/** {uuid-without-dashes}.{ext} (generateFilenameWithUUID). */
export function uuidFileName(original: string): string {
  const dot = original.lastIndexOf(".");
  const ext = dot >= 0 ? original.slice(dot + 1) : "";
  const id = crypto.randomUUID().replace(/-/g, "");
  return ext ? `${id}.${ext}` : id;
}
