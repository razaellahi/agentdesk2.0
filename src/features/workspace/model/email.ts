import { format } from "date-fns";
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
type ProviderConfig = { key?: string; value?: unknown };
/** The connector's public address (PUBLIC-EMAIL-ID) forwards into the mailbox, so it is never a recipient. */
function publicEmailId(session: unknown) {
  const configs = (
    session as { channel?: { channelConnector?: { channelProviderConfigs?: ProviderConfig[] } } } | undefined
  )?.channel?.channelConnector?.channelProviderConfigs;
  const value = Array.isArray(configs) ? configs.find((c) => c?.key === "PUBLIC-EMAIL-ID")?.value : undefined;
  return typeof value === "string" ? value : "";
}
/** When the email was sent or received: the email's own date, else the CIM timestamp. */
export function emailTimestamp(message: CimMessage) {
  const raw = message.body.receivingDate ?? message.header.timestamp;
  const number = Number(raw);
  return Number.isFinite(number) && number > 0 ? number : Date.parse(String(raw ?? ""));
}
export function emailReplyContext(message: CimMessage, session: ChannelSession, mode: EmailMode) {
  const mailbox = String(session.channel.serviceIdentifier ?? session.channelData.serviceIdentifier ?? "");
  const excluded = new Set(
    [
      mailbox,
      String(message.header.channelData?.serviceIdentifier ?? ""),
      publicEmailId(session),
      publicEmailId(message.header.channelSession),
    ]
      .filter(Boolean)
      .map((s) => s.toLowerCase()),
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
  const sent = emailTimestamp(message);
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
    // Source quotes in Outlook form: From / Sent / To / Subject above the original.
    quotedHtml: `<blockquote><p><b>From:</b> ${escapeEmailText(addresses(message.body.from).join(", "))}<br/><b>Sent:</b> ${Number.isFinite(sent) ? format(sent, "EEEE, MMMM d, yyyy h:mm:ss a") : ""}<br/><b>To:</b> ${escapeEmailText(addresses(message.body.recipientsTo).join(", "))}<br/><b>Subject:</b> ${escapeEmailText(subject)}</p>${String(message.body.htmlBody ?? "") || escapeEmailText(messageText(message)).replaceAll("\n", "<br/>")}</blockquote>`,
    forwardedAttachments:
      mode === "FORWARD" && Array.isArray(message.body.attachments)
        ? (structuredClone(message.body.attachments) as EmailAttachment[])
        : [],
  };
}
/**
 * The new part of an email and the quoted history below it (source extractEmailAndQuotedContent):
 * the history starts at the first top-level blockquote or Outlook "Sent / To / Subject" block.
 */
export function splitQuotedEmail(html: string) {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  const nodes = [...body.childNodes];
  const index = nodes.findIndex(
    (node) =>
      node.nodeType === 1 &&
      ((node as Element).tagName === "BLOCKQUOTE" ||
        ["<b>Sent:</b>", "<b>To:</b>", "<b>Subject:</b>"].every((marker) =>
          (node as Element).innerHTML.includes(marker),
        )),
  );
  // Nothing new above the history: show it all rather than an empty email.
  if (index <= 0) return { content: html, quoted: "" };
  const serialize = (list: ChildNode[]) => {
    const holder = body.ownerDocument.createElement("div");
    holder.append(...list);
    return holder.innerHTML;
  };
  return { content: serialize(nodes.slice(0, index)), quoted: serialize(nodes.slice(index)) };
}
export function validEmailRecipients(value: string) {
  const list = addresses(value);
  return list.length > 0 && list.every((address) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(address));
}
