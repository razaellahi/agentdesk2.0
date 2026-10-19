import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  sanitizeEmailHtml,
  revokeInlineImages,
  type InlineEmailImage,
  startOutboundSms,
  shouldBlockOutbound,
  useSpelling,
} from "@/features/workspace";
import type { CustomerDoc } from "./types";

export type OutboundComposeChannel = "SMS" | "WHATSAPP" | "EMAIL";

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
  const [richHtml, setRichHtml] = useState("");
  const [inlineImages, setInlineImages] = useState<InlineEmailImage[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const imageMemory = useRef<InlineEmailImage[]>([]);
  useEffect(() => {
    imageMemory.current = inlineImages;
  }, [inlineImages]);
  useEffect(() => () => revokeInlineImages(imageMemory.current), []);
  // Source outbound message-composer runs the same dictionary spell check as chat.
  const spellCheck = useDeskSettings()?.spellCheck ?? false;
  const messageArea = useRef<HTMLTextAreaElement>(null);
  const spelling = useSpelling({
    text: message,
    enabled: spellCheck && open && request?.channel !== "EMAIL",
    textareaRef: messageArea,
    onReplace: setMessage,
  });
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

  const title =
    request?.channel === "EMAIL"
      ? t("globals.email")
      : request?.channel === "WHATSAPP"
        ? t("chat-features.interactions.chat-whatsapp")
        : "SMS";

  const submit = () => {
    if (
      !request ||
      !user ||
      !permitted ||
      busy ||
      pending.current ||
      !from ||
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
                    to: request.destination,
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

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border/50 px-5 py-3.5">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="outbound-to">{t("recordings.to")}</Label>
            <Input id="outbound-to" value={request?.destination ?? ""} readOnly className="tabular-nums" />
          </div>
          {channels.length > 0 && (
            <div className="grid gap-1.5">
              <Label>{t("recordings.from")}</Label>
              <Select value={from} onValueChange={setFrom} disabled={busy}>
                <SelectTrigger className="h-[var(--density-row)]">
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
            </div>
          )}
          {!channels.length && (
            <p role="status" className="text-sm text-muted-foreground">
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
          {request?.channel === "EMAIL" && (
            <div className="grid gap-1.5">
              <Label htmlFor="outbound-subject">{t("chat-features.interactions.subject")}</Label>
              <Input
                id="outbound-subject"
                value={subject}
                disabled={busy}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <p className="text-sm font-medium">{t("chat-features.interactions.Type-a-message")}</p>
            {request?.channel === "EMAIL" ? (
              <EmailEditor
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
              />
            ) : (
              <div className="relative">
                {spelling.suggestions}
                {spelling.overlay}
                <Textarea
                  ref={messageArea}
                  id="outbound-message"
                  aria-label={t("chat-features.interactions.Type-a-message")}
                  value={message}
                  disabled={busy}
                  onChange={(event) => setMessage(event.target.value)}
                  spellCheck={spelling.textareaProps.spellCheck}
                  onSelect={spelling.textareaProps.onSelect}
                  onScroll={spelling.textareaProps.onScroll}
                  rows={4}
                  className={cn("min-h-[6rem]", spelling.textareaProps.className)}
                />
              </div>
            )}
          </div>
          {/* Source: no SMS attachments; WhatsApp sends either text or one file. */}
          {request?.channel !== "SMS" &&
            !(request?.channel === "WHATSAPP" && message.trim() && !files.length) && (
              <div className="space-y-2">
                <Label htmlFor="outbound-files">{t("workspace.attachments")}</Label>
                <Input
                  id="outbound-files"
                  type="file"
                  disabled={busy}
                  multiple={request?.channel === "EMAIL"}
                  onChange={(event) => {
                    setFiles([...(event.target.files ?? [])]);
                    event.target.value = "";
                  }}
                />
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate">{file.name}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                    >
                      {t("globals.remove")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
        </div>
        <DialogFooter className="flex-row justify-end gap-2 border-t border-border/50 bg-surface px-5 py-3">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            {t("labels.cancel")}
          </Button>
          <Button
            type="button"
            disabled={
              busy ||
              !permitted ||
              !from ||
              (!message.trim() && !files.length && !/data-inline-id=/.test(richHtml))
            }
            onClick={submit}
          >
            {t("chat-features.interactions.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
