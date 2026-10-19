import type { ChannelSession, CimMessage, Conversation } from "./types";
export function originalChannelSession(conversation: Conversation, message: CimMessage) {
  const original = message.header.channelSession as ChannelSession | undefined;
  if (original?.id) return conversation.activeChannelSessions.find((session) => session.id === original.id);
  return conversation.activeChannelSessions.find(
    (session) =>
      original?.channel?.channelType.name === session.channel.channelType.name &&
      (original.channel.serviceIdentifier ?? message.header.channelData?.serviceIdentifier) ===
        (session.channel.serviceIdentifier ?? session.channelData.serviceIdentifier),
  );
}
type Config = { key?: string; type?: string; value?: unknown };
export function connectorSupports(session: ChannelSession | undefined, key: string) {
  const connector = session?.channel.channelConnector as { channelProviderConfigs?: Config[] } | undefined;
  const configs = connector?.channelProviderConfigs;
  if (!Array.isArray(configs)) return true;
  const config = configs.find((item) => item.key === key);
  if (!config) return true;
  return (
    config.type === "Boolean" &&
    (config.value === true || (typeof config.value === "string" && config.value.toLowerCase() === "true"))
  );
}
export type SocialAction = "reply" | "private" | "like" | "hide" | "unhide" | "delete" | "post";
export function mayActOnComment(
  message: CimMessage,
  session: ChannelSession | undefined,
  action: SocialAction,
) {
  const channel = session?.channel.channelType.name.toLowerCase() ?? "";
  if (
    !session ||
    message.body.type.toLowerCase() !== "comment" ||
    message.header.sender?.type?.toLowerCase() !== "customer" ||
    !message.header.providerMessageId ||
    !message.body.postId ||
    message.isDeleted
  )
    return false;
  const key = {
    reply: "COMMENT_REPLY_SUPPORT_SM",
    private: "PRIVATE_REPLY_SUPPORT_SM",
    like: "LIKE_SUPPORT_SM",
    hide: "HIDE_SUPPORT_SM",
    unhide: "HIDE_SUPPORT_SM",
    delete: "DELETE_SUPPORT_SM",
    post: "ALLOW_VIEW_FULL_POST_SM",
  }[action];
  if (!connectorSupports(session, key)) return false;
  if (action === "unhide") return Boolean(message.isHidden && ["facebook", "instagram"].includes(channel));
  if (message.isHidden) return false;
  if (action === "private") return ["facebook", "instagram"].includes(channel);
  if (action === "like") return !["instagram", "youtube"].includes(channel);
  if (action === "hide") return !["youtube", "linkedin"].includes(channel);
  if (action === "delete") return channel !== "twitter";
  return true;
}
/** Source COMMENT envelope for reply text or media; does not mutate the quoted message. */
export function attachCommentContext(message: CimMessage, original: CimMessage, privateReply = false) {
  message.header.providerMessageId = original.header.providerMessageId;
  message.header.originalMessageId = original.id;
  message.header.intent = "REPLY_TO";
  message.body.itemType = privateReply
    ? "PRIVATE_REPLY"
    : message.body.type === "PLAIN"
      ? "TEXT"
      : message.body.type;
  message.body.type = "COMMENT";
  message.body.postId = original.body.postId;
  return message;
}

export function attachCommentEditContext(message: CimMessage, original: CimMessage) {
  message.header.providerMessageId = null;
  message.header.originalMessageId = original.id;
  message.header.intent = "UPDATE";
  message.body.type = "COMMENT";
  message.body.itemType = "TEXT";
  message.body.postId = original.body.postId;
  return message;
}

/** Edits retain the original session and audience; another agent's message is never editable. */
export function mayEditMessage(conversation: Conversation, message: CimMessage, session?: ChannelSession) {
  const type = message.body.type.toLowerCase();
  return (
    conversation.state === "ACTIVE" &&
    !message.isDeleted &&
    message.header.sender?.id === conversation.topicParticipant.participant.keycloakUser.id &&
    (!message.header.conversationId || message.header.conversationId === conversation.conversationId) &&
    (type === "plain" ||
      (type === "comment" && message.body.itemType === "TEXT" && Boolean(message.body.postId))) &&
    Boolean(
      session && !session.isDisabled && originalChannelSession(conversation, message)?.id === session.id,
    )
  );
}
