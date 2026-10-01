import { AlertCircle, Check, CheckCheck, Clock, FileText, MapPin, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatTime } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import { useMaskedValue } from "../../hooks/useMaskedValue";
import { messageText } from "../../model/outgoing";
import { lower } from "../../model/systemMessages";
import type { CimMessage, Conversation } from "../../model/types";
import { RichText } from "./RichText";
import { useSecureMedia } from "./useSecureMedia";

function formatBytes(size: unknown) {
  const n = Number(size);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function Media({
  url,
  kind,
  name,
}: {
  url?: string;
  kind: "image" | "video" | "audio" | "file";
  name?: string;
}) {
  const { t } = useTranslation();
  const { src, loading, error } = useSecureMedia(url);
  if (!url) return null;
  if (loading) return <div className="h-24 w-40 animate-pulse rounded-md bg-black/5" />;
  if (error || !src)
    return <p className="text-xs text-destructive-text">{t("workspace.media-unavailable")}</p>;
  if (kind === "image")
    return <img src={src} alt={name ?? ""} className="max-h-64 max-w-full rounded-md object-contain" />;
  if (kind === "video")
    return (
      <video src={src} controls className="max-h-64 max-w-full rounded-md">
        <track kind="captions" />
      </video>
    );
  if (kind === "audio")
    return (
      <audio src={src} controls className="w-full max-w-xs">
        <track kind="captions" />
      </audio>
    );
  return (
    <a
      href={src}
      download={name}
      className="inline-flex items-center gap-2 rounded-md border bg-surface px-2 py-1.5 text-sm text-primary"
    >
      <FileText className="size-4" />
      <span className="truncate">{name || t("workspace.file")}</span>
    </a>
  );
}

function TextBlock({ message, formatting }: { message: CimMessage; formatting: boolean }) {
  const text = messageText(message);
  if (!text) return null;
  return (
    <p className="text-sm break-words whitespace-pre-wrap">
      <RichText text={text} formatting={formatting} />
    </p>
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

/** Renders one CIM message body. Unknown types still show their label and any text. */
export function MessageBody({ message, formatting }: { message: CimMessage; formatting: boolean }) {
  const { t } = useTranslation();
  const type = lower(message.body.type);
  const item = lower(message.body.itemType);
  const file = attachmentOf(message);

  if (type === "systemnotification") {
    return (
      <p className="text-xs text-muted-foreground">
        {String(message.body.displayText ?? "")} {String(message.body.markdownText ?? "")}
      </p>
    );
  }
  if (type === "plain" || type === "notification")
    return <TextBlock message={message} formatting={formatting} />;
  if (type === "url") {
    return (
      <div className="flex flex-col gap-1">
        <TextBlock message={message} formatting={formatting} />
        {file.url && (
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm break-all text-primary underline"
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
        <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
      </div>
    );
  }
  if (type === "comment") {
    if (item === "text" || item === "private_reply" || !item)
      return <TextBlock message={message} formatting={formatting} />;
    if (item === "image" || item === "video") return <Media url={file.url} kind={item} name={file.name} />;
    return <p className="text-xs text-muted-foreground">{t("workspace.comment-action", { action: item })}</p>;
  }
  if (type === "wrapup") {
    const codes = (message.body.wrapups as { categoryName?: string; value?: string }[] | undefined) ?? [];
    return (
      <div className="text-sm">
        <p className="font-medium">{t("chat-features.interactions.wrap-up-codes")}</p>
        <ul className="mt-1 list-disc ps-4">
          {codes.map((c, i) => (
            <li key={`${c.categoryName}-${c.value}-${i}`}>
              {c.categoryName ? `${c.categoryName}: ` : ""}
              {c.value}
            </li>
          ))}
        </ul>
        {Boolean(message.body.note) && (
          <p className="mt-1 text-muted-foreground">{String(message.body.note)}</p>
        )}
      </div>
    );
  }
  if (type === "email") {
    return (
      <div className="text-sm">
        {Boolean(message.body.subject) && <p className="font-medium">{String(message.body.subject)}</p>}
        <TextBlock message={message} formatting={false} />
      </div>
    );
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
    return (
      <p className="inline-flex items-center gap-1 text-sm">
        <MapPin className="size-4" /> {loc.name || (lat != null ? `${lat}, ${lng}` : t("workspace.location"))}
      </p>
    );
  }
  if (type === "contact") {
    const contact = message.body.contact as { name?: string; phone?: string } | undefined;
    return (
      <p className="inline-flex items-center gap-1 text-sm">
        <Phone className="size-4" /> {contact?.name || contact?.phone || t("workspace.contact")}
      </p>
    );
  }
  if (type === "button" || type === "carousel" || type === "list" || type === "link") {
    const interactive = (
      message.body.additionalDetails as
        { interactive?: { header?: { text?: string }; body?: { text?: string } } } | undefined
    )?.interactive;
    const buttons = (message.body.buttons as { title?: string }[] | undefined) ?? [];
    return (
      <div className="flex flex-col gap-1 text-sm">
        {interactive?.header?.text && <p className="font-medium">{interactive.header.text}</p>}
        {interactive?.body?.text && <RichText text={interactive.body.text} formatting={formatting} />}
        {!interactive && <TextBlock message={message} formatting={formatting} />}
        {buttons.length > 0 && (
          <ul className="mt-1 flex flex-col gap-1">
            {buttons.map((b, i) => (
              <li key={i} className="rounded-md border px-2 py-1 text-center text-primary">
                {b.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  if (type === "outboundsms") return <TextBlock message={message} formatting={formatting} />;
  return (
    <div className="text-sm">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {type || t("workspace.message")}
      </p>
      <TextBlock message={message} formatting={formatting} />
    </div>
  );
}

function senderLabel(message: CimMessage, customerName: string, you: string) {
  const type = lower(message.header.sender?.type);
  if (type === "customer") return customerName;
  if (type === "agent") return message.header.sender?.id ? (message.header.sender.senderName ?? "") : you;
  if (type === "bot") return "Bot";
  if (type === "ivr") return "IVR";
  return "";
}

export function MessageRow({
  message,
  conversation,
  formatting,
  mine,
}: {
  message: CimMessage;
  conversation: Conversation;
  formatting: boolean;
  mine: boolean;
}) {
  const { t } = useTranslation();
  const customerName =
    useMaskedValue(conversation.customer.firstName, "firstName", "manage_in_conversation") ||
    t("globals.UNIDENTIFIED-CUSTOMER");
  const type = lower(message.body.type);
  const senderType = lower(message.header.sender?.type);
  const isSystem = type === "systemnotification" || senderType === "system";
  const whisper = Boolean(message.body.isWhisper);
  const deleted = Boolean(message.isDeleted);
  const stamp = Number(message.header.timestamp);
  const status = message.header.status;
  const name = senderLabel(message, customerName, t("chat-features.interactions.you"));
  const referredId = message.header.originalMessageId;
  const referred = referredId ? conversation.messages.find((m) => m.id === referredId) : undefined;

  if (isSystem) {
    return (
      <div className="px-4 py-1 text-center">
        <MessageBody message={message} formatting={false} />
      </div>
    );
  }

  return (
    <div className={cn("flex px-3 py-1", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(36rem,85%)] rounded-2xl px-3 py-2",
          mine ? "rounded-ee-sm bg-primary-soft" : "rounded-es-sm bg-surface-2",
          whisper && "border border-dashed border-warning",
          deleted && "opacity-60",
        )}
      >
        <div className="mb-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-medium">{name}</span>
          {whisper && <span>{t("chat-features.interactions.whisper")}</span>}
          {message.isEdited && <span>{t("chat-features.interactions.edited")}</span>}
          {message.isHidden && <span>{t("workspace.hidden")}</span>}
        </div>
        {referred && (
          <div className="mb-1 truncate rounded-md border-s-2 border-primary bg-surface/70 px-2 py-1 text-xs text-muted-foreground">
            {messageText(referred) || lower(referred.body.type)}
          </div>
        )}
        {deleted ? (
          <p className="text-sm italic">{t("workspace.message-deleted")}</p>
        ) : (
          <MessageBody message={message} formatting={formatting} />
        )}
        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
          {Number.isFinite(stamp) && stamp > 0 && (
            <time dateTime={new Date(stamp).toISOString()}>{formatTime(stamp)}</time>
          )}
          {mine && status === "sending" && (
            <Clock className="size-3" aria-label={t("workspace.status-sending")} />
          )}
          {mine && status === "sent" && <Check className="size-3" aria-label={t("workspace.status-sent")} />}
          {mine && status === "seen" && (
            <CheckCheck className="size-3 text-primary" aria-label={t("workspace.status-seen")} />
          )}
          {status === "failed" && (
            <AlertCircle className="size-3 text-destructive-text" aria-label={t("workspace.status-failed")} />
          )}
        </div>
      </div>
    </div>
  );
}
