import { ChevronDown, FileText, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getFileDownloadBaseUrl } from "@/config";
import { fileEngineApi } from "@/core/api";
import { formatDateTime } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import { emailTimestamp, escapeEmailText, splitQuotedEmail, type EmailAttachment } from "../../model/email";
import { emailPlainText } from "../../model/emailEditor";
import { messageText } from "../../model/outgoing";
import type { CimMessage, Conversation } from "../../model/types";
import { CustomerAvatar } from "../CustomerInitials";
import { useSecureMedia } from "./useSecureMedia";
import { useQuery } from "@tanstack/react-query";
import { loadEmailThreads } from "../../api/extras";

const addressesOf = (value: unknown): string[] =>
  (Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;]/) : [])
    .map((item) => String(item).trim())
    .filter(Boolean);

function Attachment({ file }: { file: EmailAttachment }) {
  const url =
    file.mediaUrl ??
    (file.mediaName
      ? `${getFileDownloadBaseUrl()}/api/downloadFileStream?filename=${encodeURIComponent(file.mediaName)}`
      : undefined);
  const { src, loading, error } = useSecureMedia(url);
  const label = file.mediaLabel ?? file.mediaName ?? "Attachment";
  const chip =
    "inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-surface-2/50 px-2.5 py-1.5 text-xs";
  return loading ? (
    <span className={cn(chip, "text-muted-foreground")}>
      <Loader2 className="size-3.5 animate-spin" aria-hidden />
      Loading {label}…
    </span>
  ) : error || !src ? (
    <span role="alert" className={cn(chip, "border-destructive/30 text-destructive-text")}>
      <FileText className="size-3.5 shrink-0" aria-hidden />
      {label} is unavailable
    </span>
  ) : (
    <a
      href={src}
      download={label}
      className={cn(chip, "text-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft")}
    >
      <FileText className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span className="truncate font-medium">{label}</span>
      {file.size ? (
        <span className="shrink-0 text-muted-foreground">{Math.ceil(file.size / 1024)} KB</span>
      ) : null}
    </a>
  );
}

function HtmlEmail({ message, html, expanded }: { message: CimMessage; html: string; expanded: boolean }) {
  const [loaded, setLoaded] = useState<{ raw: string; html: string }>();
  const raw = html || `<p>${escapeEmailText(messageText(message)).replaceAll("\n", "<br/>")}</p>`;
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    const run = async () => {
      const document = new DOMParser().parseFromString(raw, "text/html");
      // Active content stays inside a sandbox; only authenticated inline image blobs are enabled.
      const files = (
        Array.isArray(message.body.attachments) ? message.body.attachments : []
      ) as EmailAttachment[];
      await Promise.all(
        Array.from(document.querySelectorAll("img")).map(async (image) => {
          const source = image.getAttribute("src") ?? "";
          // Source populateInlineImages: a data-cid names the stored file, whatever the src says.
          const cid = image.getAttribute("data-cid");
          let search = "";
          if (cid) search = `?filename=${encodeURIComponent(cid)}`;
          else if (source.includes("/api/downloadFileStream"))
            search = new URL(source, globalThis.location.href).search;
          else if (source.startsWith("cid:")) {
            const file = files.find(
              (f) => f.mediaName === source.slice(4) || f.mediaLabel === source.slice(4),
            );
            if (file?.mediaName) search = `?filename=${encodeURIComponent(file.mediaName)}`;
          }
          if (!search) {
            if (!source.startsWith("data:image/")) image.removeAttribute("src");
            return;
          }
          try {
            const blob = await fileEngineApi.get<Blob>(
              `${getFileDownloadBaseUrl()}/api/downloadFileStream${search}`,
              {},
              "blob",
            );
            if (cancelled) return;
            const url = URL.createObjectURL(blob);
            urls.push(url);
            image.setAttribute("src", url);
          } catch {
            image.removeAttribute("src");
            image.setAttribute("alt", image.getAttribute("alt") || "Image unavailable");
          }
        }),
      );
      if (!cancelled) setLoaded({ raw, html: document.body.innerHTML });
    };
    void run();
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [message.body.attachments, raw]);
  const content = loaded?.raw === raw ? loaded.html : escapeEmailText(messageText(message));
  const srcDoc = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src blob: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>html{overflow-x:auto}body{font:14px/1.6 system-ui;margin:12px;overflow-wrap:break-word;color:#252a34}img{max-width:100%;height:auto}pre{white-space:pre-wrap}blockquote{border-inline-start:2px solid #ddd;padding-inline-start:12px;margin-inline:0}td,th{overflow-wrap:normal}</style></head><body>${content}</body></html>`;
  return (
    <iframe
      title={`Email content: ${String(message.body.subject ?? "No subject")}`}
      sandbox=""
      srcDoc={srcDoc}
      className={`w-full rounded-lg border bg-white ${expanded ? "min-h-96" : "h-48"}`}
    />
  );
}

const DETAIL_ROWS: [string, string][] = [
  ["from", "From"],
  ["recipientsTo", "To"],
  ["recipientsCc", "Cc"],
  ["recipientsBcc", "Bcc"],
  ["replyTo", "Reply to"],
];

/** An email as email: sender and recipients on top, the subject, the message, then its attachments. */
function EmailCard({
  message,
  name,
  outbound = false,
  expanded = false,
  actions,
}: {
  message: CimMessage;
  /** Display name of the sender; falls back to the address. */
  name?: string;
  /** Sent by the desk (accented), as opposed to received. */
  outbound?: boolean;
  expanded?: boolean;
  /** Small controls (reply, copy) shown in the header on hover. */
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(expanded);
  const [details, setDetails] = useState(false);
  const [showQuoted, setShowQuoted] = useState(false);
  const attachments = (
    Array.isArray(message.body.attachments) ? message.body.attachments : []
  ) as EmailAttachment[];
  const from = addressesOf(message.body.from)[0] ?? "";
  const to = addressesOf(message.body.recipientsTo);
  const cc = addressesOf(message.body.recipientsCc);
  const sender = name || String(message.header.sender?.senderName ?? "") || from || "Unknown sender";
  const stamp = emailTimestamp(message);
  const html = String(message.body.htmlBody ?? "");
  // The earlier conversation quoted below a reply stays folded, as in the source email view.
  const { content, quoted } = useMemo(
    () => (html ? splitQuotedEmail(html) : { content: "", quoted: "" }),
    [html],
  );
  const text = useMemo(() => (content ? emailPlainText(content) : messageText(message)), [content, message]);
  const long = text.length > 480 || text.split("\n").length > 8;
  return (
    <article
      className={cn(
        "group/email overflow-hidden rounded-xl border border-s-[3px] border-border bg-surface shadow-2xs",
        outbound ? "border-s-primary" : "border-s-border",
      )}
    >
      <header className="flex items-start gap-3 px-4 pt-3.5 pb-2.5">
        <CustomerAvatar name={sender} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="truncate text-sm font-semibold text-foreground">{sender}</span>
            {from && <span className="truncate text-xs text-muted-foreground">&lt;{from}&gt;</span>}
          </div>
          <button
            type="button"
            aria-expanded={details}
            onClick={() => setDetails((value) => !value)}
            className="flex max-w-full items-center gap-1 text-start text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="truncate">
              to {to.join(", ") || "—"}
              {cc.length > 0 && ` · cc ${cc.join(", ")}`}
            </span>
            <ChevronDown
              className={cn("size-3.5 shrink-0 transition-transform", details && "rotate-180")}
              aria-hidden
            />
            <span className="sr-only">Email recipients</span>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {Number.isFinite(stamp) && stamp > 0 && (
            <time
              className="text-xs text-muted-foreground tabular-nums"
              dateTime={new Date(stamp).toISOString()}
            >
              {formatDateTime(stamp)}
            </time>
          )}
          {actions}
        </div>
      </header>
      {details && (
        <dl className="mx-4 mb-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-surface-2/60 p-2.5 text-xs">
          {DETAIL_ROWS.map(([key, label]) => (
            <div key={key} className="contents">
              <dt className="font-medium text-muted-foreground">{label}</dt>
              <dd className="break-all text-foreground">
                {addressesOf(message.body[key]).join(", ") || "—"}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="border-t border-border/60 px-4 pt-3 pb-3.5">
        <h4 className="mb-2 text-[14px] leading-snug font-semibold text-foreground">
          {String(message.body.subject ?? "No subject")}
        </h4>
        {open ? (
          <>
            <HtmlEmail message={message} html={showQuoted ? html : content} expanded={expanded} />
            {quoted && (
              <button
                type="button"
                aria-expanded={showQuoted}
                className="me-3 mt-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => setShowQuoted(!showQuoted)}
              >
                {showQuoted ? "Hide quoted text" : "Show quoted text"}
              </button>
            )}
          </>
        ) : (
          <p
            className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap text-foreground/90",
              long && "line-clamp-6",
            )}
          >
            {text}
          </p>
        )}
        {!expanded && (
          <button
            type="button"
            className="mt-1.5 text-xs font-medium text-primary hover:underline"
            onClick={() => setOpen(!open)}
          >
            {open ? "Collapse email" : "Expand email"}
          </button>
        )}
        {attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
            {attachments.map((file, index) => (
              <Attachment key={index} file={file} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function EmailBody({
  message,
  conversation,
  name,
  outbound,
  actions,
}: {
  message: CimMessage;
  conversation?: Conversation;
  name?: string;
  outbound?: boolean;
  actions?: ReactNode;
}) {
  const [thread, setThread] = useState(false);
  const ids = new Set(
    Array.isArray(message.body.emailThreads) ? (message.body.emailThreads as string[]) : [],
  );
  ids.add(message.id);
  const messages = conversation?.messages.filter(
    (m) => ids.has(m.id) && m.body.type.toLowerCase() === "email",
  ) ?? [message];
  const serviceIdentifier = String(message.header.channelData?.serviceIdentifier ?? "");
  const query = useQuery({
    queryKey: ["email-thread", message.id, [...ids], serviceIdentifier],
    queryFn: () => loadEmailThreads([...ids], serviceIdentifier),
    enabled: thread && Boolean(serviceIdentifier),
  });
  const fullThread = query.data?.emailMessages ?? messages;
  return (
    <>
      <EmailCard message={message} name={name} outbound={outbound} actions={actions} />
      {ids.size > 1 && (
        <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => setThread(true)}>
          View full email thread ({ids.size})
        </Button>
      )}
      <Dialog open={thread} onOpenChange={setThread}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-3xl">
          <DialogTitle>Email thread</DialogTitle>
          <DialogDescription>{String(message.body.subject ?? "No subject")}</DialogDescription>
          {query.isFetching && (
            <p role="status" className="text-sm text-muted-foreground">
              Loading thread…
            </p>
          )}
          {query.isError && (
            <p role="alert" className="text-sm text-destructive-text">
              {query.error.message}
              <Button variant="ghost" onClick={() => void query.refetch()}>
                Retry
              </Button>
            </p>
          )}
          <div className="grid gap-4">
            {fullThread.map((m) => (
              <EmailCard key={m.id} message={m} expanded />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
