import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, Trash2, WandSparkles, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useDeskSettings } from "@/core/agent-settings";
import { getSession, useCurrentUser, usePermission } from "@/core/auth";
import { cn } from "@/shared/lib/utils";
import {
  channelDisplayLabel,
  getOutboundFromChannels,
  sendColdOutbound,
  escapeEmailText,
  EmailEditor,
  OutboundActionIcon,
  RefinedPreview,
  RefineWorking,
  refineText,
  sanitizeEmailHtml,
  revokeInlineImages,
  type InlineEmailImage,
  startOutboundSms,
  shouldBlockOutbound,
  useSpelling,
  validEmailRecipients,
} from "@/features/workspace";
import { RecipientInput } from "./RecipientInput";
import type { CustomerDoc } from "./types";

export type OutboundComposeChannel = "SMS" | "WHATSAPP" | "EMAIL";

/** Source outbound message-composer limit for SMS and WhatsApp. */
const MAX_MESSAGE = 1000;

export type OutboundComposeRequest = {
  channel: OutboundComposeChannel;
  destination: string;
  customer: CustomerDoc;
  complianceEnabled?: boolean;
};

/** Compact outbound compose sheet — destination, From, message, send. */
export function OutboundComposeSheet({
  request,
  onClose,
}: {
  request: OutboundComposeRequest | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const permitted = usePermission("agentSession");
  const open = Boolean(request);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  // Cold email recipients start at the customer's address and stay editable, as in the source composer.
  const [to, setTo] = useState(request?.destination ?? "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const email = request?.channel === "EMAIL";
  const recipientsValid =
    !email ||
    (validEmailRecipients(to) &&
      (!cc.trim() || validEmailRecipients(cc)) &&
      (!bcc.trim() || validEmailRecipients(bcc)));
  const [richHtml, setRichHtml] = useState("");
  const [inlineImages, setInlineImages] = useState<InlineEmailImage[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const imageMemory = useRef<InlineEmailImage[]>([]);
  useEffect(() => {
    imageMemory.current = inlineImages;
  }, [inlineImages]);
  useEffect(() => () => revokeInlineImages(imageMemory.current), []);
  // Source outbound message-composer runs the same dictionary spell check as chat.
  const deskSettings = useDeskSettings();
  const spellCheck = deskSettings?.spellCheck ?? false;
  // AI refine, as in the conversation composer: rewrite the draft, show it typed out, Apply or Discard.
  const refineEnabled = deskSettings?.textRefine ?? false;
  const [refining, setRefining] = useState(false);
  const [refinement, setRefinement] = useState<{ original: string; text: string } | null>(null);
  const refine = () => {
    const original = message;
    if (!original.trim() || refining) return;
    setRefining(true);
    void refineText(original)
      .then((next) => next && setRefinement({ original, text: next }))
      .catch((error: unknown) => toast.error(String(error)))
      .finally(() => setRefining(false));
  };
  const applyRefinement = () => {
    if (!refinement) return;
    // The rewrite is plain text: it replaces the formatted draft as paragraphs.
    setRichHtml("");
    setMessage(refinement.text);
    setRefinement(null);
  };
  const messageArea = useRef<HTMLTextAreaElement>(null);
  const spelling = useSpelling({
    text: message,
    enabled: spellCheck && open && request?.channel !== "EMAIL",
    textareaRef: messageArea,
    onReplace: setMessage,
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [chosenFrom, setFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const channelQuery = useQuery({
    queryKey: ["outbound-channels", user?.id, request?.channel],
    queryFn: () => getOutboundFromChannels(request!.channel),
    enabled: Boolean(request && permitted),
  });
  const channels = channelQuery.data?.channels ?? [];
  const from = chosenFrom || channelQuery.data?.selected || "";

  const submit = () => {
    if (
      !request ||
      !user ||
      !permitted ||
      busy ||
      pending.current ||
      !from ||
      !recipientsValid ||
      (!message.trim() && !files.length && !/data-inline-id=/.test(richHtml))
    )
      return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    void shouldBlockOutbound({
      customer: request.customer,
      value: request.destination,
      channel: request.channel,
      complianceEnabled: request.complianceEnabled,
    })
      .then(async (result) => {
        if (getSession().user?.id !== user.id || controller.signal.aborted) return;
        if (result.blocked) {
          toast.error(
            result.reason === "OPT_OUT"
              ? t("snackbar.Outbound-Blocked-Opt-Out")
              : result.reason === "DNC_CHECK_FAILED"
                ? t("snackbar.Outbound-DNC-Check-Failed")
                : t("snackbar.Outbound-Blocked-DNC"),
          );
          return;
        }
        const serviceIdentifier = from;
        if (request.channel === "SMS") {
          await startOutboundSms({
            destination: request.destination,
            from: serviceIdentifier,
            text: message,
            customer: request.customer,
          });
        } else {
          await sendColdOutbound({
            channel: request.channel,
            destination: request.destination,
            from: serviceIdentifier,
            text: message,
            customer: request.customer,
            signal: controller.signal,
            files,
            ...(request.channel === "EMAIL"
              ? {
                  email: {
                    to: to.trim(),
                    cc: cc.trim(),
                    bcc: bcc.trim(),
                    subject: subject.trim(),
                    htmlBody: richHtml
                      ? sanitizeEmailHtml(richHtml, inlineImages)
                      : escapeEmailText(message.trim()).replaceAll("\n", "<br/>"),
                    inlineImages,
                  },
                }
              : {}),
          });
        }
        if (getSession().user?.id !== user.id || controller.signal.aborted) return;
        toast.success(t("snackbar.Outbound-Message-Sent-Successfully"));
        onClose();
      })
      .catch((error: unknown) => {
        if (getSession().user?.id === user.id && !controller.signal.aborted) toast.error(String(error));
      })
      .finally(() => {
        if (pending.current === controller) pending.current = null;
        setBusy(false);
      });
  };

  const canSend =
    !busy &&
    permitted &&
    Boolean(from) &&
    recipientsValid &&
    Boolean(message.trim() || files.length || /data-inline-id=/.test(richHtml));

  if (email)
    return (
      <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
        <DialogContent className="flex h-[min(52rem,90vh)] w-[min(64rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogHeader className="flex-row items-center gap-2.5 space-y-0 border-b border-border/50 px-5 py-3">
            <OutboundActionIcon kind="email" className="size-5" />
            <DialogTitle className="text-base">{t("outbound.new-email")}</DialogTitle>
          </DialogHeader>

          {/* Mail-client header fields: a label column and borderless inputs on hairline rows. */}
          <div className="text-sm">
            {channels.length > 0 ? (
              <EmailField label={t("recordings.from")}>
                <Select value={from} onValueChange={setFrom} disabled={busy}>
                  <SelectTrigger className="h-9 w-auto min-w-48 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem
                        key={channel.id ?? channel.serviceIdentifier}
                        value={channel.serviceIdentifier || ""}
                      >
                        {channelDisplayLabel(channel)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EmailField>
            ) : (
              <EmailField label={t("recordings.from")}>
                <p role="status" className="text-muted-foreground">
                  {channelQuery.isFetching ? (
                    t("outbound.from-loading")
                  ) : (
                    <>
                      {t("outbound.from-unconfigured")}{" "}
                      <button type="button" className="underline" onClick={() => void channelQuery.refetch()}>
                        Retry
                      </button>
                    </>
                  )}
                </p>
              </EmailField>
            )}
            <EmailField label={t("recordings.to")} htmlFor="outbound-to">
              <RecipientInput id="outbound-to" value={to} onChange={setTo} disabled={busy} />
              <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                {!showCc && (
                  <button type="button" className={EMAIL_TOGGLE} onClick={() => setShowCc(true)}>
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button type="button" className={EMAIL_TOGGLE} onClick={() => setShowBcc(true)}>
                    Bcc
                  </button>
                )}
              </span>
            </EmailField>
            {showCc && (
              <EmailField label="Cc" htmlFor="outbound-cc">
                <RecipientInput id="outbound-cc" value={cc} onChange={setCc} disabled={busy} autoFocusless />
              </EmailField>
            )}
            {showBcc && (
              <EmailField label="Bcc" htmlFor="outbound-bcc">
                <RecipientInput
                  id="outbound-bcc"
                  value={bcc}
                  onChange={setBcc}
                  disabled={busy}
                  autoFocusless
                />
              </EmailField>
            )}
            <div className="flex min-h-11 items-center border-b border-border/50 px-5">
              <input
                id="outbound-subject"
                aria-label={t("chat-features.interactions.subject")}
                placeholder={t("chat-features.interactions.subject")}
                value={subject}
                disabled={busy}
                onChange={(event) => setSubject(event.target.value)}
                className={cn(EMAIL_INPUT, "text-base font-medium")}
              />
            </div>
          </div>

          {/* The message takes every remaining pixel. */}
          <div className="min-h-0 flex-1">
            <EmailEditor
              fill
              html={richHtml}
              text={message}
              images={inlineImages}
              disabled={busy}
              onChange={({ html, text, images }) => {
                setRichHtml(html);
                setMessage(text);
                setInlineImages(images);
              }}
              onSend={submit}
            >
              {(refining || refinement) && (
                <div className="px-5 pb-2">
                  {refining && <RefineWorking />}
                  {refinement && !refining && (
                    <RefinedPreview
                      key={refinement.text}
                      text={refinement.text}
                      canApply={message === refinement.original}
                      onApply={applyRefinement}
                      onDiscard={() => setRefinement(null)}
                    />
                  )}
                </div>
              )}
              {files.length > 0 && (
                <ul className="flex flex-wrap gap-2 px-5 pb-3">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex max-w-64 items-center gap-2 rounded-lg bg-surface-2 py-1 ps-2.5 pe-1 text-xs"
                    >
                      <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {fileSize(file.size)}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`${t("globals.remove")} ${file.name}`}
                        className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
                        onClick={() => setFiles(files.filter((_, i) => i !== index))}
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </EmailEditor>
          </div>

          <div className="flex items-center gap-2 border-t border-border/50 px-5 py-3">
            <Button type="button" className="rounded-full px-5" disabled={!canSend} onClick={submit}>
              <Send className="size-4" />
              {t("outbound.send")}
            </Button>
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                setFiles((current) => [...current, ...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={busy}
              aria-label={t("workspace.attachments")}
              title={t("workspace.attachments")}
              onClick={() => fileInput.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>
            {refineEnabled && (
              <RefineButton
                refining={refining}
                disabled={busy || !message.trim()}
                label={t("chat-features.interactions.refine")}
                onClick={refine}
              />
            )}
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {t("outbound.send-shortcut")}
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="ms-auto text-muted-foreground hover:text-destructive"
              disabled={busy}
              aria-label={t("outbound.discard")}
              title={t("outbound.discard")}
              onClick={onClose}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );

  // SMS and WhatsApp: the same window language as email, sized for a short message.
  const whatsapp = request?.channel === "WHATSAPP";
  // WhatsApp sends either the text or one file (source behaviour); SMS takes no attachments.
  const canAttach = whatsapp && !(message.trim() && !files.length);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="flex-row items-center gap-2.5 space-y-0 border-b border-border/50 px-5 py-3">
          <OutboundActionIcon kind={whatsapp ? "whatsapp" : "sms"} className="size-5" />
          <DialogTitle className="text-base">
            {whatsapp ? t("outbound.new-whatsapp") : t("outbound.new-sms")}
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm">
          <EmailField label={t("recordings.from")}>
            {channels.length > 0 ? (
              <Select value={from} onValueChange={setFrom} disabled={busy}>
                <SelectTrigger className="h-9 w-auto min-w-48 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem
                      key={channel.id ?? channel.serviceIdentifier}
                      value={channel.serviceIdentifier || ""}
                    >
                      {channelDisplayLabel(channel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p role="status" className="text-muted-foreground">
                {channelQuery.isFetching ? (
                  t("outbound.from-loading")
                ) : (
                  <>
                    {t("outbound.from-unconfigured")}{" "}
                    <button type="button" className="underline" onClick={() => void channelQuery.refetch()}>
                      Retry
                    </button>
                  </>
                )}
              </p>
            )}
          </EmailField>
          <EmailField label={t("recordings.to")} htmlFor="outbound-to">
            <input
              id="outbound-to"
              value={request?.destination ?? ""}
              readOnly
              className={cn(EMAIL_INPUT, "tabular-nums")}
            />
          </EmailField>
        </div>

        <div className="relative min-h-0 flex-1">
          {spelling.suggestions}
          {spelling.overlay}
          <Textarea
            ref={messageArea}
            id="outbound-message"
            aria-label={t("chat-features.interactions.Type-a-message")}
            placeholder={t("chat-features.interactions.Type-a-message")}
            value={message}
            disabled={busy || (whatsapp && files.length > 0)}
            onChange={(event) => setMessage(event.target.value)}
            spellCheck={spelling.textareaProps.spellCheck}
            onSelect={spelling.textareaProps.onSelect}
            onScroll={spelling.textareaProps.onScroll}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                submit();
              }
            }}
            rows={7}
            maxLength={MAX_MESSAGE}
            className={cn(
              "min-h-44 resize-none rounded-none border-0 px-5 py-4 text-sm leading-relaxed shadow-none focus-visible:ring-0",
              spelling.textareaProps.className,
            )}
          />
        </div>

        {(refining || refinement) && (
          <div className="px-5 pb-3">
            {refining && <RefineWorking />}
            {refinement && !refining && (
              <RefinedPreview
                key={refinement.text}
                text={refinement.text}
                canApply={message === refinement.original}
                onApply={applyRefinement}
                onDiscard={() => setRefinement(null)}
              />
            )}
          </div>
        )}

        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2 border-t border-border/50 px-5 py-2.5">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex max-w-64 items-center gap-2 rounded-lg bg-surface-2 py-1 ps-2.5 pe-1 text-xs"
              >
                <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate font-medium">{file.name}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">{fileSize(file.size)}</span>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`${t("globals.remove")} ${file.name}`}
                  className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
                  onClick={() => setFiles(files.filter((_, i) => i !== index))}
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2 border-t border-border/50 px-5 py-3">
          <Button type="button" className="rounded-full px-5" disabled={!canSend} onClick={submit}>
            <Send className="size-4" />
            {t("outbound.send")}
          </Button>
          {whatsapp && (
            <>
              <input
                ref={fileInput}
                type="file"
                hidden
                onChange={(event) => {
                  setFiles([...(event.target.files ?? [])].slice(0, 1));
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={busy || !canAttach}
                aria-label={t("workspace.attachments")}
                title={t("workspace.attachments")}
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip className="size-4" />
              </Button>
            </>
          )}
          {refineEnabled && (
            <RefineButton
              refining={refining}
              disabled={busy || !message.trim()}
              label={t("chat-features.interactions.refine")}
              onClick={refine}
            />
          )}
          <span className="ms-auto text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {message.length}/{MAX_MESSAGE}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            disabled={busy}
            aria-label={t("outbound.discard")}
            title={t("outbound.discard")}
            onClick={onClose}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const EMAIL_INPUT =
  "h-9 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:opacity-60 aria-[invalid=true]:text-destructive";
const EMAIL_TOGGLE = "rounded px-1.5 py-0.5 text-xs font-medium hover:bg-surface-2 hover:text-foreground";

/** One header line of the email: its name in a fixed column, then the field. */
function EmailField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 border-b border-border/50 px-5">
      <label htmlFor={htmlFor} className="w-12 shrink-0 text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** "Refine" with AI, the same mark as the conversation composer; it twinkles while the AI writes. */
function RefineButton({
  refining,
  disabled,
  label,
  onClick,
}: {
  refining: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 rounded-full px-3 text-[13px] text-foreground/80 hover:bg-surface-2"
      disabled={disabled || refining}
      title={label}
      onClick={onClick}
    >
      <WandSparkles
        className={cn("size-4", refining ? "desk-ai-spark text-(--ai-2)" : "text-primary")}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className={refining ? "desk-ai-text" : undefined}>{label}</span>
    </Button>
  );
}
