import { ccmApi } from "@/core/api";
import { can, getSession } from "@/core/auth";
import { socketManager } from "@/core/realtime";
import { getDeskSettings } from "@/core/agent-settings";
import { uploadFile, type UploadedFile } from "../api";
import { ALLOWED_EXTENSIONS, buildMediaMessage, toCimEvent } from "../model/outgoing";
import { getFileDownloadBaseUrl } from "@/config";
import { useConversationStore } from "../store/conversationStore";
import { publishCimEvent } from "./commands";
import { getOutboundFromChannels, shouldBlockOutbound } from "../api/outbound";
import { loadEmailSignature } from "../api/extras";
import { escapeEmailText, validEmailRecipients, type EmailPayload } from "../model/email";
import { formatWhatsAppNumber } from "../model/outbound";
import { mayCompose, sendEmail, sendText } from "./actions";
import { waitForOutboundSession } from "./outboundActivation";

export interface ColdOutboundInput {
  channel: "EMAIL" | "WHATSAPP";
  destination: string;
  from: string;
  text: string;
  customer?: { _id?: string; labels?: unknown[]; [key: string]: unknown };
  email?: EmailPayload;
  files?: File[];
  signal?: AbortSignal;
}
/** Start the conversation first, then dispatch against its confirmed, pinned channel session. */
export async function sendColdOutbound(input: ColdOutboundInput) {
  const user = getSession().user;
  if (!user || !can("agentSession") || !socketManager.connected)
    throw new Error("Connect your agent session before sending.");
  const destination =
    input.channel === "WHATSAPP" ? formatWhatsAppNumber(input.destination) : input.destination.trim();
  if (
    input.channel === "EMAIL"
      ? !validEmailRecipients(destination) ||
        !input.email ||
        !validEmailRecipients(input.email.to) ||
        Boolean(input.email.cc && !validEmailRecipients(input.email.cc)) ||
        Boolean(input.email.bcc && !validEmailRecipients(input.email.bcc))
      : !/^\+?[0-9]{3,15}$/.test(destination)
  )
    throw new Error("Enter a valid destination.");
  if (!input.text.trim() && !input.files?.length && !/data-inline-id=/.test(input.email?.htmlBody ?? ""))
    throw new Error("Enter a message or attach a file.");
  if (input.channel === "WHATSAPP" && (input.files?.length ?? 0) > 1)
    throw new Error("Attach one file per outbound WhatsApp message.");
  if (
    input.files?.some((file) => !ALLOWED_EXTENSIONS.includes(file.name.split(".").pop()?.toLowerCase() ?? ""))
  )
    throw new Error("An attachment has an unsupported file type.");
  const channels = await getOutboundFromChannels(input.channel);
  if (!input.from || !channels.channels.some((channel) => channel.serviceIdentifier === input.from))
    throw new Error("Choose a configured outbound From channel.");
  const compliance = await shouldBlockOutbound({
    customer: input.customer,
    value: destination,
    channel: input.channel,
    complianceEnabled: getDeskSettings().callingCompliance,
  });
  if (compliance.blocked) throw new Error(`Outbound message blocked: ${compliance.reason}`);
  if (getSession().user?.id !== user.id || !can("agentSession") || input.signal?.aborted)
    throw new Error("Your session changed or the send was cancelled.");
  let media: UploadedFile | undefined;
  if (input.channel === "WHATSAPP" && input.files?.[0]) {
    const form = new FormData();
    form.append("file", input.files[0]);
    media = await uploadFile(form);
    if (getSession().user?.id !== user.id || input.signal?.aborted)
      throw new Error("Your session changed or the send was cancelled.");
  }
  const mediaKind = media?.type.split("/")[0] ?? "";
  await ccmApi.post("/message/receive", {
    id: crypto.randomUUID(),
    header: {
      channelData: {
        channelCustomerIdentifier: destination,
        serviceIdentifier: input.from,
        additionalAttributes: [{ key: "agentId", type: "String100", value: user.id }],
      },
      sender: { id: user.id, senderName: user.firstName ?? user.username, type: "AGENT" },
      language: {},
      timestamp: Date.now(),
      securityInfo: {},
      stamps: [],
      intent: "AGENT_OUTBOUND",
      entities: {},
      customer: input.customer ?? null,
    },
    body: media
      ? {
          type: ["image", "video", "audio"].includes(mediaKind) ? mediaKind.toUpperCase() : "FILE",
          caption: input.files![0]!.name,
          markdownText: input.text.trim(),
          attachment: {
            mediaUrl: `${getFileDownloadBaseUrl()}/api/downloadFileStream?filename=${encodeURIComponent(media.name)}`,
            mimeType: media.type,
            size: media.size,
            thumbnail: "",
          },
          additionalDetails: ["image", "video", "audio"].includes(mediaKind) ? {} : { fileName: media.name },
        }
      : { type: "PLAIN", markdownText: input.channel === "EMAIL" ? "" : input.text.trim() },
  });
  const { conversation, session } = await waitForOutboundSession({
    owner: user.id,
    channel: input.channel,
    destination,
    from: input.from,
    customerId: input.customer?._id,
    signal: input.signal,
  });
  if (input.channel === "EMAIL") {
    const signature = await loadEmailSignature(input.from, user.username).catch(() => ({
      signatureBodyWithAgentName: "",
    }));
    if (getSession().user?.id !== user.id || input.signal?.aborted)
      throw new Error("Your agent session changed.");
    const email = input.email!;
    const ok = await sendEmail(
      conversation.conversationId,
      input.text,
      {
        ...email,
        from: input.from,
        replyTo: [input.from],
        htmlBody: `${email.htmlBody || escapeEmailText(input.text).replaceAll("\n", "<br/>")}${signature.signatureBodyWithAgentName ? `<br/>${signature.signatureBodyWithAgentName}` : ""}`,
      },
      input.files ?? [],
      { sessionId: session.id, signal: input.signal },
    );
    if (!ok) throw new Error("The email was not sent. Your draft is retained.");
  } else {
    if (media) {
      const latest = useConversationStore.getState().byId[conversation.conversationId];
      const pinned = latest
        ? {
            ...latest,
            activeChannelSessions: latest.activeChannelSessions.map((item) => ({
              ...item,
              isChecked: item.id === session.id,
            })),
          }
        : null;
      if (
        !pinned ||
        getSession().user?.id !== user.id ||
        input.signal?.aborted ||
        !socketManager.connected ||
        !mayCompose(pinned)
      )
        throw new Error("The message was not sent. Your draft is retained.");
      const message = buildMediaMessage(pinned, session, media, getFileDownloadBaseUrl());
      message.body.markdownText = input.text.trim();
      message.body.caption = input.files![0]!.name;
      const { cimEvent, local } = toCimEvent("AGENT_MESSAGE", pinned, message);
      publishCimEvent(pinned, cimEvent);
      if (local) useConversationStore.getState().addLocalMessage(conversation.conversationId, local);
    } else if (
      !sendText(conversation.conversationId, input.text, { sessionId: session.id, signal: input.signal })
    )
      throw new Error("The message was not sent. Your draft is retained.");
  }
  return conversation.conversationId;
}
