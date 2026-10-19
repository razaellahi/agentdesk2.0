import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getFileDownloadBaseUrl } from "@/config";
import { fileEngineApi } from "@/core/api";
import { escapeEmailText, type EmailAttachment } from "../../model/email";
import { messageText } from "../../model/outgoing";
import type { CimMessage, Conversation } from "../../model/types";
import { useSecureMedia } from "./useSecureMedia";
import { useQuery } from "@tanstack/react-query";
import { loadEmailThreads } from "../../api/extras";
function Attachment({ file }: { file: EmailAttachment }) {
  const url =
    file.mediaUrl ??
    (file.mediaName
      ? `${getFileDownloadBaseUrl()}/api/downloadFileStream?filename=${encodeURIComponent(file.mediaName)}`
      : undefined);
  const { src, loading, error } = useSecureMedia(url);
  const label = file.mediaLabel ?? file.mediaName ?? "Attachment";
  return loading ? (
    <span className="text-xs text-muted-foreground">Loading {label}…</span>
  ) : error || !src ? (
    <span role="alert" className="text-xs text-destructive-text">
      {label} is unavailable
    </span>
  ) : (
    <a href={src} download={label} className="rounded-md border px-2 py-1 text-xs text-primary">
      {label}
      {file.size ? ` · ${Math.ceil(file.size / 1024)} KB` : ""}
    </a>
  );
}
function HtmlEmail({ message, expanded }: { message: CimMessage; expanded: boolean }) {
  const [loaded, setLoaded] = useState<{ id: string; html: string }>();
  const raw =
    String(message.body.htmlBody ?? "") ||
    `<p>${escapeEmailText(messageText(message)).replaceAll("\n", "<br/>")}</p>`;
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
          let search = "";
          if (source.includes("/api/downloadFileStream"))
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
      if (!cancelled) setLoaded({ id: message.id, html: document.body.innerHTML });
    };
    void run();
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [message.id, message.body.attachments, raw]);
  const content = loaded?.id === message.id ? loaded.html : escapeEmailText(messageText(message));
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
function Card({ message, expanded = false }: { message: CimMessage; expanded?: boolean }) {
  const [open, setOpen] = useState(expanded);
  const attachments = (
    Array.isArray(message.body.attachments) ? message.body.attachments : []
  ) as EmailAttachment[];
  const addresses = (value: unknown) => (Array.isArray(value) ? value.join(", ") : String(value ?? ""));
  return (
    <div className="min-w-0 space-y-2 text-sm">
      <p className="font-semibold">{String(message.body.subject ?? "No subject")}</p>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Email recipients</summary>
        <dl className="mt-1 space-y-1">
          {["from", "recipientsTo", "recipientsCc", "recipientsBcc", "replyTo"].map((key) => (
            <div key={key}>
              <dt className="inline font-medium">
                {
                  (
                    {
                      from: "From",
                      recipientsTo: "To",
                      recipientsCc: "Cc",
                      recipientsBcc: "Bcc",
                      replyTo: "Reply to",
                    } as Record<string, string>
                  )[key]
                }
                :{" "}
              </dt>
              <dd className="inline break-all">{addresses(message.body[key]) || "—"}</dd>
            </div>
          ))}
        </dl>
      </details>
      {open ? (
        <HtmlEmail message={message} expanded={expanded} />
      ) : (
        <p className="line-clamp-4 whitespace-pre-wrap">{messageText(message)}</p>
      )}
      {!expanded && (
        <button type="button" className="text-xs text-primary" onClick={() => setOpen(!open)}>
          {open ? "Collapse email" : "Expand email"}
        </button>
      )}
      <div className="flex flex-wrap gap-2">
        {attachments.map((file, index) => (
          <Attachment key={index} file={file} />
        ))}
      </div>
    </div>
  );
}
export function EmailBody({ message, conversation }: { message: CimMessage; conversation?: Conversation }) {
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
      <Card message={message} />
      <Button variant="ghost" size="sm" className="mt-2" onClick={() => setThread(true)}>
        View full email thread ({ids.size})
      </Button>
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
          <div className="grid gap-5">
            {fullThread.map((m) => (
              <div key={m.id} className="rounded-xl border p-4">
                <Card message={m} expanded />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
