import type { CimMessage, ChannelSession } from "./types";
import { messageText } from "./outgoing";
export interface EmailAttachment {
  mediaLabel?: string;
  mediaName?: string;
  mediaUrl?: string;
  mimeType?: string;
  size?: number;
  thumbnail?: string;
}
export interface InlineEmailImage {
  id: string;
  file: File;
  url: string;
}
export interface EmailPayload {
  subject: string;
  htmlBody: string;
  to: string;
  cc?: string;
  bcc?: string;
  from?: string;
  replyTo?: string[];
  emailThreads?: string[];
  attachments?: EmailAttachment[];
  inlineImages?: InlineEmailImage[];
}
export type EmailMode = "REPLY_TO" | "REPLY_ALL" | "FORWARD";
export const escapeEmailText = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const addresses = (value: unknown): string[] =>
  (Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;]/) : [])
    .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
    .map((v) => v.trim());
export function emailReplyContext(message: CimMessage, session: ChannelSession, mode: EmailMode) {
  const mailbox = String(session.channel.serviceIdentifier ?? session.channelData.serviceIdentifier ?? "");
  const excluded = new Set(
    [mailbox, String(message.header.channelData?.serviceIdentifier ?? "")].map((s) => s.toLowerCase()),
  );
  const clean = (list: string[]) => [
    ...new Map(list.filter((v) => !excluded.has(v.toLowerCase())).map((v) => [v.toLowerCase(), v])).values(),
  ];
  const replyTo = addresses(message.body.replyTo);
  const candidates = clean([...addresses(message.body.recipientsTo), ...replyTo]);
  const sender = addresses(message.body.from);
  const preferred = clean(replyTo).length
    ? clean(replyTo)
    : clean(sender).length
      ? clean(sender)
      : candidates;
  const subject = String(message.body.subject ?? "");
  return {
    subject:
      mode === "FORWARD"
        ? /^fwd:/i.test(subject)
          ? subject
          : `Fwd: ${subject.replace(/^re:\s*/i, "")}`
        : /^re:/i.test(subject)
          ? subject
          : `Re: ${subject}`,
    to:
      mode === "FORWARD"
        ? ""
        : (mode === "REPLY_ALL" ? clean([...preferred, ...candidates]) : preferred).join(", "),
    cc: mode === "REPLY_ALL" ? clean(addresses(message.body.recipientsCc)).join(", ") : "",
    bcc: mode === "REPLY_ALL" ? clean(addresses(message.body.recipientsBcc)).join(", ") : "",
    emailThreads: [...new Set([...addresses(message.body.emailThreads), message.id])],
    quotedHtml: `<blockquote><p>Subject: ${escapeEmailText(subject)}<br/>From: ${escapeEmailText(addresses(message.body.from).join(", "))}</p>${String(message.body.htmlBody ?? "") || escapeEmailText(messageText(message)).replaceAll("\n", "<br/>")}</blockquote>`,
    forwardedAttachments:
      mode === "FORWARD" && Array.isArray(message.body.attachments)
        ? (structuredClone(message.body.attachments) as EmailAttachment[])
        : [],
  };
}
export function validEmailRecipients(value: string) {
  const list = addresses(value);
  return list.length > 0 && list.every((address) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(address));
}
