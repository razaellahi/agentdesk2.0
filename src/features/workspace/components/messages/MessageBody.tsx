import {
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
  CornerDownLeft,
  Eye,
  EyeOff,
  Heart,
  Info,
  Lock,
  MapPin,
  Pencil,
  Phone,
  RotateCcw,
  Star,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { IconTooltip } from "@/components/common/IconTooltip";
import { formatTime, formatDuration, formatDateTime } from "@/core/i18n";
import { getSession, useScope } from "@/core/auth";
import { cn } from "@/shared/lib/utils";
import { useMaskedValue } from "../../hooks/useMaskedValue";
import { messageText } from "../../model/outgoing";
import { lower } from "../../model/systemMessages";
import type { CimMessage, Conversation, Sender } from "../../model/types";
import { CustomerAvatar } from "../CustomerInitials";
import { retryFailedMessage, sendCommentAction } from "../../session/actions";
import { useComposerStore, composerKey } from "../../store/composerStore";
import { useConversationStore } from "../../store/conversationStore";
import { RichText } from "./RichText";
import { Media } from "./Media";
import { StructuredBody } from "./StructuredBody";
import { httpLink } from "../../model/links";
import { EmailBody } from "./EmailBody";
import { emailReplyContext } from "../../model/email";
import {
  activityCustomerNumber,
  canPlayActivityRecording,
  type VoiceActivity,
  type ActivityLeg,
} from "../../model/voiceActivity";
import { parseConversationInsight, formatDataValue } from "../../model/conversationInsight";
import { mayActOnComment, mayEditMessage, originalChannelSession } from "../../model/social";
import { SocialPostDialog } from "./SocialPostDialog";
import type { ChannelSession } from "../../model/types";

function formatBytes(size: unknown) {
  const n = Number(size);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function TextBlock({ message, formatting }: { message: CimMessage; formatting: boolean }) {
  const text = messageText(message);
  if (!text) return null;
  return (
    <div className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">
      <RichText text={text} formatting={formatting} />
    </div>
  );
}

function attachmentOf(message: CimMessage) {
  const attachment = message.body.attachment as
    { mediaUrl?: string; mimeType?: string; size?: number } | undefined;
  const details = message.body.additionalDetails as { fileName?: string } | undefined;
  return {
    url: attachment?.mediaUrl ?? (message.body.mediaUrl as string | undefined),
    mime: String(attachment?.mimeType ?? ""),
    size: attachment?.size,
    name: details?.fileName ?? (message.body.caption as string | undefined) ?? "",
  };
}

function VoiceLeg({
  leg,
  context,
  all,
  own,
  me,
}: {
  leg: ActivityLeg;
  context: string;
  all: boolean;
  own: boolean;
  me?: string;
}) {
  const name = useMaskedValue(leg.sender?.senderName, "firstName", context);
  const dialog = leg.additionalDetail?.dialog;
  const wrapups = Array.isArray(dialog?.wrapUpItems)
    ? dialog.wrapUpItems.join(", ")
    : dialog?.wrapUpItems || dialog?.wrapUpReason;
  return (
    <li className="space-y-1.5 rounded-xl border border-border/60 bg-surface/80 p-2.5 text-xs shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-foreground">
          {leg.sender?.type === "IVR" ? "IVR" : name || "Participant"}
        </span>
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground tabular">
          {formatDuration(leg.duration ?? 0)}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {[dialog?.queueName, leg.startDirection?.replaceAll("_", " "), leg.endDirection?.replaceAll("_", " ")]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {leg.additionalDetail?.activities?.length ? (
        <p className="text-[11px] text-muted-foreground/90">
          {leg.additionalDetail.activities
            .map((step) => [step.menu, step.selection].filter(Boolean).join(" → "))
            .join(" → ")}
        </p>
      ) : null}
      {wrapups && <p className="text-[11px] font-medium text-foreground/80">Wrap-up: {wrapups}</p>}
      {leg.voiceRecordingUrl && canPlayActivityRecording(all, own, me, [leg]) && (
        <div className="pt-1">
          <Media url={leg.voiceRecordingUrl} kind="audio" name="Call leg recording" />
        </div>
      )}
    </li>
  );
}

function VoiceActivityBody({ message, conversation }: { message: CimMessage; conversation?: Conversation }) {
  const all = useScope("recording-link", "view_all"),
    own = useScope("recording-link", "view");
  const me = getSession().user?.id;
  const context = conversation?.roomInfo === "FAKE_CONVERSATION" ? "manage" : "manage_in_conversation";
  const data = (message.body.data ?? {}) as VoiceActivity;
  const legs = data.callLegs ?? [];
  const number = useMaskedValue(activityCustomerNumber(legs), "voice", context);
  const voicemail = lower(message.header.intent) === "voice_mail_activity";
  const permitted = canPlayActivityRecording(all, own, me, legs);
  return (
    <section
      className="min-w-[min(15rem,100%)] space-y-2 text-sm"
      aria-label={voicemail ? "Voicemail activity" : "Voice activity"}
    >
      <div className="flex items-center gap-2 font-semibold">
        <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
          <Phone className="size-3.5" />
        </div>
        <span className="text-foreground">{voicemail ? "Voicemail Activity" : "Voice Call"}</span>
        {number && (
          <span className="ms-auto rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs font-normal text-muted-foreground">
            {number}
          </span>
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {data.startTime ? formatDateTime(data.startTime) : ""}
          {data.endTime ? ` – ${formatTime(data.endTime)}` : ""}
        </span>
        <span className="font-mono font-medium">{formatDuration(data.duration ?? 0)}</span>
      </div>
      {data.recordingUrl && permitted && <Media url={data.recordingUrl} kind="audio" name="Call recording" />}
      {legs.length > 0 && (
        <details open={legs.length === 1} className="group">
          <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
            {legs.length} call {legs.length === 1 ? "leg" : "legs"}
          </summary>
          <ul className="mt-2 grid gap-1.5">
            {legs.map((leg, index) => (
              <VoiceLeg key={leg.id ?? index} leg={leg} context={context} all={all} own={own} me={me} />
            ))}
          </ul>
        </details>
      )}
      {!legs.length && !data.recordingUrl && (
        <p className="text-xs text-muted-foreground">Call activity recorded.</p>
      )}
    </section>
  );
}

function ConversationDataBody({ message }: { message: CimMessage }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const insight = parseConversationInsight(message.body.conversationData);
  return (
    <div className="my-1.5 max-w-sm min-w-[min(16rem,100%)] rounded-xl border border-border/80 bg-surface/90 p-2.5 shadow-2xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 text-start text-xs font-semibold text-foreground transition-colors hover:text-primary"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Info className="size-3.5 shrink-0 text-primary" />
          {t("chat-features.customer-info.conversation-data")}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 border-t border-border/60 pt-2 text-xs">
          {insight.sentiment && (
            <p className="text-[11.5px]">
              <span className="text-muted-foreground">{t("chat-features.customer-info.sentiment")}: </span>
              <span className="font-semibold text-foreground capitalize">{insight.sentiment}</span>
            </p>
          )}
          {insight.rows.map((row, index) => (
            <p key={`${row.key}:${index}`} className="text-[11.5px]">
              <span className="text-muted-foreground">{row.key}: </span>
              <span className="font-medium text-foreground">{formatDataValue(row.value)}</span>
            </p>
          ))}
          {insight.summary && (
            <div className="rounded-lg border border-border/40 bg-surface-2/60 p-2 text-[11.5px]">
              <p className="font-semibold text-foreground">
                {insight.summary.heading || t("chat-features.customer-info.summary")}
              </p>
              <p className="mt-1 leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {insight.summary.content}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FormAttribute {
  label?: string;
  attributeType?: string;
  valueType?: string;
  answer?: unknown;
}

interface FormSection {
  sectionName?: string;
  attributes?: FormAttribute[];
}

function answerText(attr: FormAttribute) {
  if (attr.attributeType === "OPTIONS") {
    if (!Array.isArray(attr.answer)) return "";
    return attr.answer
      .filter((opt) => (opt as { isSelected?: boolean })?.isSelected)
      .map((opt) => String((opt as { label?: string }).label ?? ""))
      .filter(Boolean)
      .join(", ");
  }
  const raw = Array.isArray(attr.answer) ? attr.answer[0] : attr.answer;
  if (raw == null || raw === "") return "";
  if (attr.valueType === "dateTime" || attr.valueType === "date" || attr.valueType === "time") {
    const stamp = new Date(String(raw));
    if (!Number.isNaN(stamp.getTime())) {
      if (attr.valueType === "date") return stamp.toLocaleDateString();
      if (attr.valueType === "time") return stamp.toLocaleTimeString();
      return stamp.toLocaleString();
    }
  }
  return String(raw);
}

function FormDataBody({ message }: { message: CimMessage }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => {
    const sections = (message.body.sections as FormSection[] | undefined) ?? [];
    const list: { key: string; label: string; value: string; section?: string }[] = [];
    sections.forEach((section, sIndex) => {
      (section.attributes ?? []).forEach((attr, aIndex) => {
        const value = answerText(attr);
        if (!value) return;
        list.push({
          key: `${sIndex}-${aIndex}-${attr.label}`,
          label: attr.label || t("workspace.message"),
          value,
          section: section.sectionName,
        });
      });
    });
    return list;
  }, [message.body.sections, t]);
  const visible = expanded ? rows : rows.slice(0, 3);
  const title = [message.body.formTitle, message.body.formDescription].filter(Boolean).join(" | ");
  const cancelled =
    (message.body.additionalDetails as { status?: string } | undefined)?.status === "cancelled";

  return (
    <div className="min-w-[min(14rem,100%)] text-sm">
      {title && (
        <p className="mb-2 text-xs font-semibold text-foreground">
          {title}
          {cancelled && (
            <span className="py-0.2 ms-1 rounded-full bg-destructive-soft px-1.5 text-[10px] text-destructive-text">
              ({t("globals.cancelled")})
            </span>
          )}
        </p>
      )}
      <dl className="space-y-1.5">
        {visible.map((row) => (
          <div key={row.key} className="rounded-lg border border-border/30 bg-surface-2/60 p-1.5">
            {expanded && row.section && (
              <p className="mb-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                {row.section}
              </p>
            )}
            <dt className="text-[11px] font-medium text-muted-foreground">{row.label}</dt>
            <dd className="mt-0.5 text-xs font-semibold whitespace-pre-wrap text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
      {rows.length > 3 && (
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-primary hover:underline"
          onClick={() => setExpanded((value) => !value)}
        >
          {t(expanded ? "globals.view-less" : "globals.view-more")}
        </button>
      )}
    </div>
  );
}

/** Renders one CIM message body. Unknown types still show their label and any text. */
export function MessageBody({
  message,
  formatting,
  conversation,
}: {
  message: CimMessage;
  formatting: boolean;
  conversation?: Conversation;
}) {
  const { t } = useTranslation();
  const type = lower(message.body.type);
  const item = lower(message.body.itemType);
  const file = attachmentOf(message);

  if (type === "voice" && message.body.data)
    return <VoiceActivityBody message={message} conversation={conversation} />;
  if (type === "conversationdata") return <ConversationDataBody message={message} />;

  if (type === "systemnotification") {
    // The row supplies the layout; this is just the words (e.g. "You left the conversation").
    return (
      <>
        {String(message.body.displayText ?? "")}
        {message.body.markdownText ? (
          <>
            {message.body.displayText ? " " : null}
            <span className="font-medium text-foreground/80">{String(message.body.markdownText)}</span>
          </>
        ) : null}
      </>
    );
  }
  if (type === "plain" || type === "notification")
    return <TextBlock message={message} formatting={formatting} />;
  if (type === "form_data") return <FormDataBody message={message} />;
  if (type === "url") {
    return (
      <div className="flex flex-col gap-1.5">
        <TextBlock message={message} formatting={formatting} />
        {httpLink(file.url) && (
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium break-all text-primary hover:underline"
          >
            {file.url}
          </a>
        )}
      </div>
    );
  }
  if (type === "image" || type === "sticker") return <Media url={file.url} kind="image" name={file.name} />;
  if (type === "video") return <Media url={file.url} kind="video" name={file.name} />;
  if (type === "audio" || type === "voice") return <Media url={file.url} kind="audio" name={file.name} />;
  if (type === "file") {
    return (
      <div className="flex flex-col gap-1">
        <Media url={file.url} kind="file" name={file.name} />
        <span className="font-mono text-[11px] text-muted-foreground">{formatBytes(file.size)}</span>
      </div>
    );
  }
  if (type === "comment") {
    if (item === "text" || item === "private_reply" || !item)
      return (
        <>
          <CommentHeader message={message} />
          <TextBlock message={message} formatting={formatting} />
        </>
      );
    if (item === "image" || item === "video") return <Media url={file.url} kind={item} name={file.name} />;
    return <p className="text-xs text-muted-foreground">{t("workspace.comment-action", { action: item })}</p>;
  }
  if (type === "wrapup") {
    const codes = (message.body.wrapups as { categoryName?: string; value?: string }[] | undefined) ?? [];
    return (
      <div className="space-y-1 text-xs">
        <p className="font-semibold text-foreground">{t("chat-features.interactions.wrap-up-codes")}</p>
        <ul className="flex flex-wrap gap-1">
          {codes.map((c, i) => (
            <li
              key={`${c.categoryName}-${c.value}-${i}`}
              className="rounded-md border border-border/40 bg-surface-2 px-2 py-0.5 font-medium"
            >
              {c.categoryName ? `${c.categoryName}: ` : ""}
              {c.value}
            </li>
          ))}
        </ul>
        {Boolean(message.body.note) && (
          <p className="mt-1 text-muted-foreground italic">{String(message.body.note)}</p>
        )}
      </div>
    );
  }
  if (type === "email") {
    return <EmailBody message={message} conversation={conversation} />;
  }
  if (type === "location") {
    const loc = (message.body.location ?? message.body) as {
      name?: string;
      latitude?: number;
      longitude?: number;
      lat?: number;
      lng?: number;
    };
    const lat = loc.latitude ?? loc.lat;
    const lng = loc.longitude ?? loc.lng;
    const label = loc.name || (lat != null ? `${lat}, ${lng}` : t("workspace.location"));
    const href =
      lat != null && lng != null
        ? `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`
        : null;
    return href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft/50 px-2.5 py-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <MapPin className="size-3.5" /> {label}
      </a>
    ) : (
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
        <MapPin className="size-3.5" /> {label}
      </p>
    );
  }
  if (type === "contact") {
    const contact = message.body.contact as { name?: string; phone?: string } | undefined;
    const name = contact?.name || t("workspace.contact", { defaultValue: "Contact" });
    const phone = contact?.phone || "";
    return (
      <div className="flex max-w-sm items-center gap-3 rounded-xl border border-border/70 bg-surface/90 p-2.5 shadow-2xs transition-colors hover:bg-surface-2/80">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary ring-1 ring-primary/20">
          <Phone className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{name}</p>
          {phone ? (
            <p className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">{phone}</p>
          ) : (
            <p className="text-[10px] text-muted-foreground">{t("workspace.contact")}</p>
          )}
        </div>
        {phone && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
              title={t("globals.copy", { defaultValue: "Copy phone" })}
              aria-label={t("globals.copy", { defaultValue: "Copy phone" })}
              onClick={(e) => {
                e.stopPropagation();
                void navigator.clipboard.writeText(phone);
                toast.success(t("snackbar.copied", { defaultValue: "Copied to clipboard" }));
              }}
            >
              <Copy className="size-3.5" />
            </button>
            <a
              href={`tel:${phone}`}
              className="grid size-7 place-items-center rounded-full border border-primary/20 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              title={t("chat-features.interactions.call-customer", { defaultValue: "Call" })}
              aria-label={t("chat-features.interactions.call-customer", { defaultValue: "Call" })}
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="size-3.5" />
            </a>
          </div>
        )}
      </div>
    );
  }
  if (["button", "carousel", "list", "link"].includes(type))
    return <StructuredBody message={message} formatting={formatting} />;

  if (type === "outboundsms") return <TextBlock message={message} formatting={formatting} />;
  return (
    <div className="text-sm">
      <p className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
        {type || t("workspace.message")}
      </p>
      <TextBlock message={message} formatting={formatting} />
    </div>
  );
}

function senderLabel(message: CimMessage, customerName: string, you: string, bot: string) {
  const type = lower(message.header.sender?.type);
  if (type === "customer") return customerName;
  if (type === "agent") return message.header.sender?.id ? (message.header.sender.senderName ?? "") : you;
  if (type === "bot") return bot;
  if (type === "ivr") return "IVR";
  return "";
}

export function MessageRow({
  message,
  conversation,
  formatting,
  mine,
  continued = false,
  latestOwn = false,
}: {
  message: CimMessage;
  conversation: Conversation;
  formatting: boolean;
  mine: boolean;
  /** Same sender as the previous row: the name is not repeated. */
  continued?: boolean;
  /** The agent's most recent message: its delivery state is spelled out. */
  latestOwn?: boolean;
}) {
  const { t } = useTranslation();
  const [postOpen, setPostOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const customerName =
    useMaskedValue(
      conversation.customer.firstName,
      "firstName",
      conversation.roomInfo === "FAKE_CONVERSATION" ? "manage" : "manage_in_conversation",
    ) || t("globals.UNIDENTIFIED-CUSTOMER");
  const type = lower(message.body.type);
  const senderType = lower(message.header.sender?.type);
  const isSystem =
    type === "systemnotification" ||
    (senderType === "system" && !["voice", "conversationdata"].includes(type));
  const outbound = mine || ["agent", "bot", "ivr"].includes(senderType);
  const whisper = Boolean(message.body.isWhisper);
  const deleted = Boolean(message.isDeleted);
  const stamp = Number(message.header.timestamp);
  const status = message.header.status;
  const name = senderLabel(
    message,
    customerName,
    t("chat-features.interactions.you"),
    t("workspace.sender-bot"),
  );
  const referredId = message.header.originalMessageId;
  const referred = referredId ? conversation.messages.find((m) => m.id === referredId) : undefined;
  const editSession = originalChannelSession(conversation, message);
  const canEdit = mine && mayEditMessage(conversation, message, editSession);
  const canRetry = status === "failed" && conversation.state === "ACTIVE";
  const isComment = type === "comment";
  const originalSession =
    conversation.activeChannelSessions.find(
      (session) => session.id === (message.header.channelSession as ChannelSession | undefined)?.id,
    ) ?? (message.header.channelSession as ChannelSession | undefined);
  const canSocial = (action: Parameters<typeof mayActOnComment>[2]) =>
    mayActOnComment(message, originalSession, action);

  const reply = (privateReply = false) => {
    const channelSession = originalChannelSession(conversation, message);
    if (!channelSession) return;
    useConversationStore.getState().selectReplySession(conversation.conversationId, channelSession.id);
    const current = useConversationStore.getState().byId[conversation.conversationId] ?? conversation;
    const key = composerKey(current);
    useComposerStore.getState().setReplyTo(key, message.id);
    useComposerStore.getState().patch(key, { privateReply, whisper: false });
    if (type === "email")
      useComposerStore.getState().patch(key, {
        ...emailReplyContext(message, channelSession, "REPLY_TO"),
        emailMode: "REPLY_TO",
        emailInitialized: true,
      });
  };

  const copyText = () => {
    const text = messageText(message);
    if (!text) return;
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      toast.success(t("chat-features.interactions.copied", { defaultValue: "Copied to clipboard" }));
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (isSystem) {
    return (
      <div
        role="status"
        data-message-id={message.id}
        className="desk-msg-in px-8 py-1.5 text-center text-xs leading-snug text-muted-foreground"
      >
        <MessageBody message={message} formatting={false} />
        {Number.isFinite(stamp) && stamp > 0 && (
          <time
            className="ms-1.5 text-[11px] tabular opacity-70"
            dateTime={new Date(stamp).toISOString()}
            title={formatDateTime(stamp)}
          >
            {formatTime(stamp)}
          </time>
        )}
      </div>
    );
  }

  // An email is not a chat bubble: a full-width email card with its own small header actions.
  if (type === "email" && !whisper) {
    const canReplyByEmail = conversation.state === "ACTIVE" && conversation.composerEnabled;
    const iconButton =
      "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground";
    const emailActions = (
      <span className="flex items-center opacity-0 transition-opacity group-focus-within/email:opacity-100 group-hover/email:opacity-100 [@media(hover:none)]:opacity-100">
        {messageText(message) && (
          <IconTooltip label={t("workspace.copy-message")}>
            <button
              type="button"
              className={iconButton}
              aria-label={t("workspace.copy-message")}
              onClick={copyText}
            >
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            </button>
          </IconTooltip>
        )}
        {canReplyByEmail && (
          <IconTooltip label={t("chat-features.interactions.reply")}>
            <button
              type="button"
              className={cn(iconButton, "hover:text-primary")}
              aria-label={t("chat-features.interactions.reply")}
              onClick={() => reply()}
            >
              <CornerDownLeft className="size-3.5" />
            </button>
          </IconTooltip>
        )}
      </span>
    );
    return (
      <div
        data-message-id={message.id}
        className={cn("desk-msg-in group/msg relative px-4", continued ? "pt-1.5" : "pt-3")}
      >
        <div className="max-w-3xl min-w-0">
          <EmailBody
            message={message}
            conversation={conversation}
            name={name}
            outbound={outbound}
            actions={emailActions}
          />
          <DeliveryLine
            message={message}
            latest={latestOwn}
            onRetry={canRetry ? () => retryFailedMessage(conversation.conversationId, message) : undefined}
            readerContext={
              conversation.roomInfo === "FAKE_CONVERSATION" ? "manage" : "manage_in_conversation"
            }
          />
        </div>
      </div>
    );
  }

  const validStamp = Number.isFinite(stamp) && stamp > 0;
  const fullTime = validStamp ? formatDateTime(stamp) : undefined;

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "desk-msg-in group/msg relative flex px-4",
        continued ? "pt-1" : "pt-3",
        outbound ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn("flex max-w-[min(40rem,85%)] min-w-0 flex-col", outbound ? "items-end" : "items-start")}
      >
        {/* Turn header: who (never for your own messages) and when. The sender's kind is in the name. */}
        {!continued && (
          <div className="mb-1 flex items-center gap-1.5 px-1 text-xs">
            {!mine && name && (
              <span className="truncate text-[13px] font-medium tracking-normal text-foreground">{name}</span>
            )}
            {validStamp && (
              <time
                className="shrink-0 text-[11px] font-normal text-muted-foreground/75 tabular"
                dateTime={new Date(stamp).toISOString()}
                title={fullTime}
              >
                {formatTime(stamp)}
              </time>
            )}
          </div>
        )}

        <div
          className={cn("relative flex max-w-full min-w-0 items-end gap-1.5", outbound && "flex-row-reverse")}
        >
          {/* Message Bubble Container */}
          <div
            title={continued ? fullTime : undefined}
            className={cn(
              "group/bubble relative min-w-0 rounded-2xl px-4 py-2 text-[14px] leading-relaxed transition-shadow",
              outbound
                ? cn("bg-bubble-agent text-foreground shadow-2xs", !continued && "rounded-tr-xs")
                : cn("bg-bubble-customer text-foreground shadow-2xs", !continued && "rounded-tl-xs"),
              whisper && "border border-dashed border-warning/50 bg-warning-soft text-foreground",
              deleted && "opacity-60",
              // In flight: soft until the server confirms; full strength once sent.
              mine &&
                status === "sending" &&
                "opacity-55 blur-[0.6px] saturate-75 transition-[opacity,filter]",
            )}
          >
            {/* Whisper or Status Badges */}
            {(whisper || message.isEdited || message.isHidden) && (
              <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                {whisper && (
                  <span className="py-0.2 inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 font-semibold text-amber-700 dark:text-amber-300">
                    <Lock className="size-3" aria-hidden />
                    {t("workspace.internal-note")}
                  </span>
                )}
                {message.isEdited && <span className="italic">{t("chat-features.interactions.edited")}</span>}
                {message.isHidden && <span>{t("workspace.hidden")}</span>}
              </div>
            )}

            {/* Quoted Message Reference */}
            {referred && lower(referred.body.type) !== "form_data" && (
              <div className="my-1 truncate rounded-lg border-l-2 border-primary bg-surface/80 px-2.5 py-1 text-xs text-muted-foreground">
                {messageText(referred) || lower(referred.body.type)}
              </div>
            )}

            {deleted ? (
              <p className="text-sm italic opacity-80">{t("workspace.message-deleted")}</p>
            ) : (
              <MessageBody message={message} formatting={formatting} conversation={conversation} />
            )}
            {/* Floating Message Action Bar */}
            {/* Floating Message Action Bar: a small pill on the bubble's outer top edge, as in Google Chat. */}
            <div
              className={cn(
                "absolute -top-3.5 z-10 flex items-center gap-0.5 rounded-full border border-border/70 bg-surface p-0.5 text-muted-foreground shadow-lift empty:hidden",
                "pointer-events-none scale-95 opacity-0 transition-all group-hover/bubble:pointer-events-auto group-hover/bubble:scale-100 group-hover/bubble:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100",
                outbound ? "end-3" : "start-3",
              )}
            >
              {/* Copy message button */}
              {messageText(message) && (
                <IconTooltip label={t("workspace.copy-message")}>
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground"
                    aria-label={t("workspace.copy-message")}
                    onClick={copyText}
                  >
                    {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                  </button>
                </IconTooltip>
              )}

              {/* Reply button */}
              {conversation.state === "ACTIVE" &&
                conversation.composerEnabled &&
                (type === "email" || type === "plain" || (type === "comment" && canSocial("reply"))) && (
                  <IconTooltip label={t("chat-features.interactions.reply")}>
                    <button
                      type="button"
                      className="grid size-7 place-items-center rounded-full text-primary transition-colors hover:bg-primary-soft"
                      aria-label={t("chat-features.interactions.reply")}
                      onClick={() => reply()}
                    >
                      <CornerDownLeft className="size-4" />
                    </button>
                  </IconTooltip>
                )}

              {!mine &&
                conversation.state === "ACTIVE" &&
                conversation.composerEnabled &&
                isComment &&
                canSocial("private") && (
                  <button
                    type="button"
                    className="rounded-full px-1.5 py-0.5 font-medium text-primary hover:bg-primary-soft"
                    onClick={() => reply(true)}
                  >
                    {t("workspace.private-reply")}
                  </button>
                )}

              {isComment && canSocial("post") && (
                <button
                  type="button"
                  className="rounded-full px-1.5 py-0.5 font-medium text-primary hover:bg-primary-soft"
                  onClick={() => setPostOpen(true)}
                >
                  {t("chat-features.interactions.view-full-post")}
                </button>
              )}

              {canEdit && (
                <IconTooltip label={t("chat-features.interactions.edit-message")}>
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground"
                    aria-label={t("chat-features.interactions.edit-message")}
                    onClick={() => {
                      if (!editSession) return;
                      useConversationStore
                        .getState()
                        .selectReplySession(conversation.conversationId, editSession.id);
                      useComposerStore
                        .getState()
                        .setEdit(
                          composerKey(
                            useConversationStore.getState().byId[conversation.conversationId] ?? conversation,
                          ),
                          message.id,
                          messageText(message),
                        );
                    }}
                  >
                    <Pencil className="size-4" />
                  </button>
                </IconTooltip>
              )}

              {isComment && !deleted && conversation.state === "ACTIVE" && (
                <>
                  {canSocial("like") && (
                    <button
                      type="button"
                      className={cn(
                        "rounded-full p-1 transition-colors hover:bg-surface-2",
                        message.isLiked ? "text-primary" : "hover:text-primary",
                      )}
                      aria-label={t("workspace.comment-action", { action: "like" })}
                      aria-pressed={Boolean(message.isLiked)}
                      onClick={() => sendCommentAction(conversation.conversationId, message, "like")}
                    >
                      {/* Source: heart on X/Twitter, thumbs-up elsewhere. */}
                      {lower(originalSession?.channel.channelType.name) === "twitter" ? (
                        <Heart className={cn("size-3", message.isLiked && "fill-current")} />
                      ) : (
                        <ThumbsUp className={cn("size-3", message.isLiked && "fill-current")} />
                      )}
                    </button>
                  )}
                  {canSocial(message.isHidden ? "unhide" : "hide") && (
                    <button
                      type="button"
                      className="rounded-full p-1 transition-colors hover:bg-surface-2 hover:text-foreground"
                      aria-label={t("workspace.comment-action", {
                        action: message.isHidden ? "unhide" : "hide",
                      })}
                      onClick={() =>
                        sendCommentAction(
                          conversation.conversationId,
                          message,
                          message.isHidden ? "unhide" : "hide",
                        )
                      }
                    >
                      {message.isHidden ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                    </button>
                  )}
                  {canSocial("delete") && (
                    <button
                      type="button"
                      className="rounded-full p-1 transition-colors hover:bg-destructive-soft hover:text-destructive"
                      aria-label={t("workspace.comment-action", { action: "delete" })}
                      onClick={() => sendCommentAction(conversation.conversationId, message, "delete")}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <DeliveryLine
          message={message}
          latest={latestOwn}
          onRetry={canRetry ? () => retryFailedMessage(conversation.conversationId, message) : undefined}
          readerContext={conversation.roomInfo === "FAKE_CONVERSATION" ? "manage" : "manage_in_conversation"}
        />
      </div>

      {postOpen && originalSession && (
        <SocialPostDialog
          postId={String(message.body.postId)}
          serviceIdentifier={
            originalSession.channel.serviceIdentifier ?? originalSession.channelData?.serviceIdentifier ?? ""
          }
          context={conversation.roomInfo === "FAKE_CONVERSATION" ? "manage" : "manage_in_conversation"}
          onClose={() => setPostOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Customer comment header (source comment-message): "Post Comment" on a top-level
 * comment on a post, and app name + read-only stars on Play Store / App Store reviews.
 */
function CommentHeader({ message }: { message: CimMessage }) {
  const { t } = useTranslation();
  if (lower(message.header.sender?.type) !== "customer") return null;
  const channel = lower(
    (message.header.channelSession as ChannelSession | undefined)?.channel?.channelType?.name,
  );
  const topLevel =
    Boolean(message.body.postId) &&
    (lower(message.header.intent) !== "reply_to" || !message.header.originalMessageId);
  const review = channel === "play_store" || channel === "apple_store";
  const extra = (message.body.additionalData ?? {}) as { appName?: string; appRating?: number };
  const rating = Number(extra.appRating);
  const showReview = review && (Boolean(extra.appName) || rating > 0);
  if (!topLevel && !showReview) return null;
  return (
    <div className="mb-1.5 border-b border-border/50 pb-1.5">
      {topLevel && (
        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {t("chat-features.interactions.post-comment")}
        </p>
      )}
      {showReview && extra.appName && <p className="text-xs font-semibold capitalize">{extra.appName}</p>}
      {showReview && rating > 0 && (
        <div
          className="flex items-center gap-0.5"
          role="img"
          aria-label={t("workspace.app-rating", { rating })}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "size-3.5",
                rating >= n - 0.5 ? "fill-warning text-warning" : "fill-border text-border",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Delivery state under the agent's own message (source chat-messages status and
 * delivery-report): an icon on every message, spelled out on the latest one and on
 * failures (with Retry), plus who has read up to here.
 */
function DeliveryLine({
  message,
  latest,
  onRetry,
  readerContext,
}: {
  message: CimMessage;
  latest: boolean;
  onRetry?: () => void;
  readerContext: string;
}) {
  const { t } = useTranslation();
  const failed = message.header.status === "failed";
  const readers = (message.header.seenStatuses ?? []).filter((reader) => reader.id);
  // Only what needs attention: a message that did not go through, and who has read the
  // latest one. Sending is the soft bubble itself; sent is just the bubble at full strength.
  if (!failed && !(latest && readers.length)) return null;
  return (
    <div className="mt-1 flex items-center gap-2 px-1 text-[11px]">
      {failed ? (
        <>
          <span role="status" className="inline-flex items-center gap-1 text-destructive-text">
            <AlertCircle className="size-3" aria-hidden />
            {t("workspace.status-failed")}
          </span>
          {onRetry && (
            <button
              type="button"
              className="inline-flex items-center gap-0.5 rounded px-1 font-semibold text-destructive-text hover:bg-destructive-soft focus-visible:ring-2 focus-visible:ring-destructive/30 focus-visible:outline-none"
              onClick={onRetry}
            >
              <RotateCcw className="size-3" aria-hidden />
              {t("workspace.retry")}
            </button>
          )}
        </>
      ) : (
        <SeenBy readers={readers} context={readerContext} />
      )}
    </div>
  );
}

function SeenBy({ readers, context }: { readers: Sender[]; context: string }) {
  const { t } = useTranslation();
  return (
    <span
      className="inline-flex items-center"
      role="img"
      aria-label={t("workspace.seen-by", { count: readers.length })}
    >
      <span className="flex -space-x-1.5">
        {readers.slice(0, 4).map((reader) => (
          <Reader key={reader.id} reader={reader} context={context} />
        ))}
      </span>
      {readers.length > 4 && <span className="ms-1.5 text-muted-foreground">+{readers.length - 4}</span>}
    </span>
  );
}

/** One reader: the customer's name is PII and masked; agents show their full name. */
function Reader({ reader, context }: { reader: Sender; context: string }) {
  const { t } = useTranslation();
  const customer = lower(reader.type) === "customer";
  const masked = useMaskedValue(customer ? reader.senderName : undefined, "firstName", context);
  const detail = reader.additionalDetail as { firstName?: string; lastName?: string } | undefined;
  const name = customer
    ? masked || t("globals.UNIDENTIFIED-CUSTOMER")
    : [detail?.firstName, detail?.lastName].filter(Boolean).join(" ") || reader.senderName || "";
  return (
    <span title={t("workspace.seen-by-name", { name })} className="rounded-full ring-2 ring-surface">
      <CustomerAvatar name={name} size="xs" className="size-4.5 text-[8px]" />
    </span>
  );
}
