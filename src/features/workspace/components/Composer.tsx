import {
  Bold,
  Italic,
  Loader2,
  Lock,
  Paperclip,
  Pencil,
  PenLine,
  Send,
  Smile,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getConfig } from "@/config";
import { useFeature } from "@/config/featureFlags";
import { useDeskSettings } from "@/core/agent-settings";
import { getSession, useCurrentUser } from "@/core/auth";
import { getVoicePassword } from "@/features/voice";
import { cn } from "@/shared/lib/utils";
import { loadQuickReplies, refineText } from "../api";
import { createSecureVideoLink, isSecureLinkConfigured, loadEmailSignature } from "../api/extras";
import { sendEmail, sendFiles, sendText, sendTyping } from "../session/actions";
import { useComposerStore, composerKey, EMPTY_DRAFT } from "../store/composerStore";
import { ALLOWED_EXTENSIONS } from "../model/outgoing";
import { emailReplyContext, escapeEmailText } from "../model/email";
import type { ChannelSession, Conversation } from "../model/types";
import { useMaskedValue } from "../hooks/useMaskedValue";
import { ChannelBadge } from "./ChannelIcon";
import { EmailEditor } from "./email/EmailEditor";
import { plainEmailHtml, sanitizeEmailHtml } from "../model/emailEditor";
import { QuickRepliesButton } from "./QuickRepliesButton";
import { useConversationStore } from "../store/conversationStore";
import { useSpelling } from "../spellcheck/useSpelling";
import { onComposerFocusRequest } from "../store/composerFocus";

const EMOJIS = "😀 😁 😂 😊 😍 😎 😢 😡 👍 👎 🙏 🎉 ✅ ❌ ❤️ 🔥 👋 🤔 📎 ⭐".split(" ");

function wrapSelection(value: string, start: number, end: number, marker: string) {
  const selected = value.slice(start, end) || "text";
  return {
    next: value.slice(0, start) + marker + selected + marker + value.slice(end),
    cursor: start + marker.length + selected.length + marker.length,
  };
}

function slashQuery(value: string) {
  const match = /(^|\s)\/([^\s]*)$/.exec(value);
  if (!match) return null;
  return { term: (match[2] ?? "").toLowerCase(), start: match.index + (match[1]?.length ?? 0) };
}

/** Reply box: text, formatting, emoji, attachments, whisper and channel choice. */
export function Composer({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation();
  const settings = useDeskSettings();
  const user = useCurrentUser();
  const quickRepliesEnabled = useFeature("quickReplies");
  const fieldId = useId();
  const draftKey = composerKey(conversation);
  const draft = useComposerStore((s) => s.drafts[draftKey] ?? EMPTY_DRAFT);
  const { text, subject, emailMode, replyToId, editMessageId } = draft;
  const editTarget = conversation.messages.find((m) => m.id === editMessageId);
  const whisper = editTarget
    ? Boolean(editTarget.body.isWhisper)
    : (draft.whisper ?? ["WHISPER", "ASSISTANT"].includes(conversation.topicParticipant.role));
  const patchDraft = (patch: Partial<typeof draft>) => useComposerStore.getState().patch(draftKey, patch);
  const setText = (value: string | ((current: string) => string)) => {
    const current = useComposerStore.getState().drafts[draftKey]?.text ?? "";
    const next = typeof value === "function" ? value(current) : value;
    const previous = useComposerStore.getState().drafts[draftKey];
    patchDraft({
      text: next,
      richHtml:
        previous?.richHtml && next.startsWith(current)
          ? `${previous.richHtml}${plainEmailHtml(next.slice(current.length))}`
          : "",
    });
  };
  const setSubject = (subject: string) => patchDraft({ subject });
  const setWhisper = (whisper: boolean) => patchDraft({ whisper });
  const uploading = draft.sending;
  const [refining, setRefining] = useState(false);
  const [refinement, setRefinement] = useState<{ key: string; original: string; text: string } | null>(null);
  const [signature, setSignature] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const composerRoot = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const sessions = conversation.activeChannelSessions.filter((s) => !s.isDisabled);
  const stateBlocked =
    !conversation.composerEnabled ||
    conversation.hold.active ||
    conversation.wrapUp.show ||
    conversation.state !== "ACTIVE" ||
    conversation.topicParticipant.role === "SILENT_MONITOR" ||
    (["WHISPER", "ASSISTANT"].includes(conversation.topicParticipant.role) &&
      conversation.agentParticipants.length === 0) ||
    (conversation.topicParticipant.role === "ASSISTANT" && !whisper);

  const session = sessions.find((item) => item.isChecked);
  const email = session?.channel.channelType.name.toLowerCase() === "email";
  const spelling = useSpelling({
    text,
    enabled: settings.spellCheck && !email,
    textareaRef: area,
    onReplace: (next) => setText(next),
  });
  const emailTarget =
    conversation.messages.find((m) => m.id === replyToId && m.body.type.toLowerCase() === "email") ??
    conversation.messages.findLast((m) => m.body.type.toLowerCase() === "email");
  const commentTarget = conversation.messages.find(
    (m) => m.id === replyToId && m.body.type.toLowerCase() === "comment",
  );
  const channelName = session?.channel.channelType.name.toLowerCase() ?? "";
  // Source: store reviews never take attachments; Instagram and private replies are text-only.
  const commentAttachmentsBlocked =
    ["play_store", "apple_store"].includes(channelName) ||
    Boolean(commentTarget && (draft.privateReply || channelName === "instagram"));
  const setEmailMode = (emailMode: typeof draft.emailMode) => {
    patchDraft({
      emailMode,
      emailInitialized: true,
      ...(emailTarget && session
        ? { ...emailReplyContext(emailTarget, session, emailMode), replyToId: emailTarget.id }
        : {}),
    });
  };
  const replyRequired = ["youtube", "linkedin", "play_store", "apple_store"].includes(channelName);
  const blocked = stateBlocked || !session || (replyRequired && !replyToId && !editMessageId);
  const canWhisper =
    conversation.agentParticipants.length > 1 ||
    ["WHISPER", "ASSISTANT"].includes(conversation.topicParticipant.role);
  const suggestions = (conversation.messages.at(-1)?.botSuggestions ?? []) as {
    text?: string;
    confidence?: number;
    confidenceLevel?: string | number;
  }[];
  // Source interactions.component placeholder ladder for comments and bot suggestions.
  const placeholder = editMessageId
    ? t("chat-features.interactions.edit-message")
    : whisper
      ? t("chat-features.interactions.Type-a-whisper-message")
      : replyRequired && !commentTarget
        ? t("chat-features.interactions.unable-to-send-comment")
        : suggestions.length
          ? t(
              commentTarget
                ? "chat-features.interactions.bot-suggestions-available-for-reply-to-a-comment"
                : "chat-features.interactions.bot-suggestions-available",
            )
          : commentTarget
            ? t(
                ["youtube", "linkedin"].includes(channelName)
                  ? "chat-features.interactions.youtube-reply-to-comment"
                  : "chat-features.interactions.Type-a-reply-to-comment",
              )
            : t("chat-features.interactions.Type-a-message");
  const slash = slashQuery(text);
  const repliesQuery = useQuery({
    queryKey: ["quick-replies", user?.id],
    enabled: quickRepliesEnabled && Boolean(slash) && Boolean(user?.id),
    queryFn: () => loadQuickReplies(user!.id),
  });
  const slashMatches = useMemo(() => {
    if (!slash) return [];
    const term = slash.term;
    return (repliesQuery.data?.replies ?? [])
      .filter(
        (reply) =>
          !term ||
          reply.message.toLowerCase().includes(term) ||
          reply.tags.some((tag) => tag.toLowerCase().includes(term)),
      )
      .slice(0, 6);
  }, [repliesQuery.data?.replies, slash]);

  useEffect(
    () =>
      onComposerFocusRequest(conversation.conversationId, () =>
        // After the reply channel switch has rendered (an email session swaps the editor).
        requestAnimationFrame(() => {
          const target =
            area.current ??
            composerRoot.current?.querySelector<HTMLElement>("[contenteditable='true'], textarea, input");
          target?.focus();
        }),
      ),
    [conversation.conversationId],
  );
  useEffect(() => {
    let cancelled = false;
    const update = (value: string) => {
      if (!cancelled) setSignature(value);
    };
    if (email && session?.channelData.serviceIdentifier && user) {
      void loadEmailSignature(session.channelData.serviceIdentifier, user.username)
        .then((result) => update(result.signatureBodyWithAgentName))
        .catch(() => update(""));
    } else queueMicrotask(() => update(""));
    return () => {
      cancelled = true;
    };
  }, [email, session?.channelData.serviceIdentifier, user]);
  useEffect(() => {
    if (!email || !session || draft.emailInitialized) return;
    useComposerStore.getState().patch(draftKey, {
      emailInitialized: true,
      ...(emailTarget
        ? { ...emailReplyContext(emailTarget, session, "REPLY_TO"), replyToId: emailTarget.id }
        : { to: session.channelData.channelCustomerIdentifier ?? "" }),
    });
  }, [email, session, draft.emailInitialized, draftKey, emailTarget]);

  const queueFiles = (files: File[]) => {
    const accepted = files.filter((file) => {
      if (ALLOWED_EXTENSIONS.includes(file.name.split(".").pop()?.toLowerCase() ?? "")) return true;
      toast.error(`${file.name}: unsupported file type`);
      return false;
    });
    const current = useComposerStore.getState().drafts[draftKey] ?? EMPTY_DRAFT;
    patchDraft({ files: [...current.files, ...accepted] });
  };
  const send = async () => {
    const current = useComposerStore.getState().drafts[draftKey] ?? EMPTY_DRAFT;
    if (
      blocked ||
      current.sending ||
      (!current.text.trim() &&
        !current.files.length &&
        !current.forwardedAttachments.length &&
        !(email && /data-inline-id=/.test(current.richHtml)))
    )
      return;
    if (commentAttachmentsBlocked && current.files.length) {
      toast.error("Remove attachments before sending this comment reply.");
      return;
    }
    const owner = user?.id;
    patchDraft({ sending: true });
    try {
      const plainSignature = signature.replace(/<[^>]+>/g, "").trim();
      const htmlText = current.richHtml
        ? sanitizeEmailHtml(current.richHtml, current.inlineImages)
        : escapeEmailText(current.text).replaceAll("\n", "<br/>");
      if (email) {
        const ok = await sendEmail(
          conversation.conversationId,
          current.text,
          {
            subject: current.subject,
            htmlBody: `${signature && !current.text.trim().endsWith(plainSignature) ? `${htmlText}<br/>${signature}` : htmlText}${current.quotedHtml ? `<hr/>${current.quotedHtml}` : ""}`,
            to: current.to,
            cc: current.cc,
            bcc: current.bcc,
            emailThreads: current.emailThreads,
            attachments: current.forwardedAttachments,
            inlineImages: current.inlineImages,
          },
          current.files,
          { originalMessageId: current.replyToId, intent: current.emailMode },
        );
        if (ok && getSession().user?.id === owner)
          patchDraft({
            text: "",
            richHtml: "",
            inlineImages: [],
            files: [],
            forwardedAttachments: [],
            quotedHtml: "",
            replyToId: null,
            emailThreads: [],
          });
        return;
      }
      const ok =
        !current.text.trim() ||
        sendText(conversation.conversationId, current.text, {
          privateReply: current.privateReply,
          whisper,
          originalMessageId: editMessageId ?? replyToId,
          intent: editMessageId ? "UPDATE" : email ? emailMode : replyToId ? "REPLY_TO" : null,
          email: email
            ? {
                subject,
                htmlBody:
                  signature && !current.text.trim().endsWith(plainSignature)
                    ? `${htmlText}<br/>${signature}`
                    : htmlText,
                to: current.to || session?.channelData.channelCustomerIdentifier || "",
                cc: current.cc,
                bcc: current.bcc,
              }
            : undefined,
        });
      if (!ok) return;
      if (current.text.trim())
        patchDraft({ text: "", replyToId: null, editMessageId: null, editSeed: null, privateReply: false });
      if (current.files.length) {
        const sent = await sendFiles(conversation.conversationId, current.files, {
          whisper,
          originalMessageId: replyToId,
          privateReply: current.privateReply,
        });
        // Preserve files queued while an upload was in flight.
        if (getSession().user?.id !== owner || !useComposerStore.getState().drafts[draftKey]) return;
        const latest = useComposerStore.getState().drafts[draftKey]!;
        patchDraft({ files: latest.files.filter((file) => !sent.includes(file)) });
      }
    } finally {
      if (getSession().user?.id === owner && useComposerStore.getState().drafts[draftKey])
        patchDraft({ sending: false });
    }
  };

  const applyFormat = (marker: string) => {
    const el = area.current;
    if (!el) return;
    const { next, cursor } = wrapSelection(text, el.selectionStart, el.selectionEnd, marker);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const applySlash = (message: string) => {
    if (!slash) return;
    setText(`${text.slice(0, slash.start)}${message}${text.slice(slash.start + 1 + slash.term.length)}`);
    area.current?.focus();
  };

  return (
    <div
      ref={composerRoot}
      className={cn(
        "relative rounded-2xl border transition-all",
        whisper
          ? "border-amber-500/50 bg-amber-500/[0.03] ring-1 ring-amber-500/20"
          : "border-border/70 bg-surface shadow-2xs focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15",
        "px-3.5 pt-2.5 pb-2",
      )}
    >
      {whisper && (
        <div className="mb-2.5 flex animate-in items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-600 fade-in slide-in-from-top-1 dark:text-amber-400">
          <div className="flex items-center gap-1.5 font-semibold">
            <Lock className="size-3.5 shrink-0" />
            <span>{t("chat-features.interactions.whisper")}</span>
            <span className="hidden text-[11px] font-normal opacity-90 sm:inline">
              · {t("workspace.whisper-hint")}
            </span>
          </div>
          {!["WHISPER", "ASSISTANT"].includes(conversation.topicParticipant.role) && !editMessageId && (
            <button
              type="button"
              className="text-xs font-medium underline-offset-2 hover:underline"
              onClick={() => setWhisper(false)}
            >
              {t("globals.close")}
            </button>
          )}
        </div>
      )}
      {editMessageId && (
        <div className="mb-2 flex animate-in items-center justify-between rounded-xl border border-primary/20 bg-primary-soft/70 px-3 py-1.5 text-xs font-medium text-primary fade-in slide-in-from-bottom-1">
          <span>{t("chat-features.interactions.edit-message")}</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              useComposerStore.getState().setEdit(draftKey, null);
              setText("");
            }}
          >
            {t("globals.close")}
          </button>
        </div>
      )}
      {replyToId && !editMessageId && (
        <div className="mb-2 flex animate-in items-center justify-between rounded-xl border border-primary/20 bg-primary-soft/70 px-3 py-1.5 text-xs font-medium text-primary fade-in slide-in-from-bottom-1">
          <span>{t("chat-features.interactions.reply")}</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => useComposerStore.getState().setReplyTo(draftKey, null)}
          >
            {t("globals.close")}
          </button>
        </div>
      )}
      {suggestions.length > 0 && (
        <section aria-label={t("canned-Messages.bot-suggestions")} className="mb-2 space-y-1">
          <h3 className="px-1 text-[11px] font-semibold text-muted-foreground">
            {t("canned-Messages.bot-suggestions")}
          </h3>
          <ul className="space-y-1">
            {suggestions
              .filter((suggestion) => suggestion.text)
              .map((suggestion) => (
                <li
                  key={suggestion.text}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-2/50 py-1.5 ps-3 pe-1.5"
                >
                  <p className="line-clamp-2 min-w-0 flex-1 text-xs leading-snug text-foreground">
                    {suggestion.text}
                  </p>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="size-7 shrink-0 rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
                    aria-label={t("chat-features.interactions.edit-message")}
                    title={t("chat-features.interactions.edit-message")}
                    disabled={blocked}
                    onClick={() => setText(suggestion.text ?? "")}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="size-7 shrink-0 rounded-full text-primary hover:bg-primary-soft"
                    aria-label={t("chat-features.interactions.send")}
                    title={t("chat-features.interactions.send")}
                    disabled={blocked}
                    onClick={() => sendText(conversation.conversationId, suggestion.text ?? "", { whisper })}
                  >
                    <Send className="size-3.5" />
                  </Button>
                </li>
              ))}
          </ul>
        </section>
      )}
      {slashMatches.length > 0 && (
        <div className="mb-2 overflow-hidden rounded-xl border bg-surface shadow-soft">
          {slashMatches.map((reply) => (
            <button
              key={reply.id}
              type="button"
              className="block w-full truncate px-3 py-2 text-start text-xs hover:bg-muted"
              onClick={() => applySlash(reply.message)}
            >
              {reply.message}
            </button>
          ))}
        </div>
      )}
      {email && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {(["REPLY_TO", "REPLY_ALL", "FORWARD"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={uploading}
              onClick={() => setEmailMode(mode)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${emailMode === mode ? "border-primary bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t(
                mode === "REPLY_TO"
                  ? "chat-features.interactions.reply"
                  : mode === "REPLY_ALL"
                    ? "chat-features.interactions.reply-all"
                    : "chat-features.interactions.forward",
              )}
            </button>
          ))}
          <Input
            aria-label="Email subject"
            disabled={uploading}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder={t("chat-features.interactions.subject")}
            className="h-8 min-w-40 flex-1"
          />
        </div>
      )}
      {draft.privateReply && (
        <p className="mb-2 rounded-lg border border-primary/30 bg-primary-soft px-2.5 py-1.5 text-xs font-medium text-primary">
          Private reply to this comment
        </p>
      )}
      {sessions.length > 1 && (
        <div
          className="mb-2 flex flex-wrap items-center gap-1 rounded-xl bg-muted/40 p-1"
          role="radiogroup"
          aria-label={t("chat-features.interactions.selected-channel")}
        >
          <span className="px-1.5 text-[10px] font-semibold text-muted-foreground uppercase">Channel:</span>
          {conversation.activeChannelSessions.map((item) => (
            <ChannelChoice
              key={item.id}
              conversation={conversation}
              session={item}
              // Name two sessions of one channel type apart by their (masked) identifier.
              ambiguous={
                conversation.activeChannelSessions.filter(
                  (other) => other.channel.channelType.name === item.channel.channelType.name,
                ).length > 1
              }
              disabled={Boolean(item.isDisabled) || stateBlocked || uploading}
            />
          ))}
        </div>
      )}
      {email && (
        <div className="mb-2 grid gap-2 text-xs">
          <p className="text-muted-foreground">
            From: {session?.channel.serviceIdentifier ?? session?.channelData.serviceIdentifier ?? "—"}
          </p>
          <label htmlFor={`${fieldId}-to`} className="flex items-center gap-2">
            To
            <Input
              id={`${fieldId}-to`}
              disabled={uploading}
              value={draft.to}
              onChange={(e) => patchDraft({ to: e.target.value })}
              className="h-8"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label htmlFor={`${fieldId}-cc`} className="flex items-center gap-2">
              Cc
              <Input
                id={`${fieldId}-cc`}
                disabled={uploading}
                value={draft.cc}
                onChange={(e) => patchDraft({ cc: e.target.value })}
                className="h-8"
              />
            </label>
            <label htmlFor={`${fieldId}-bcc`} className="flex items-center gap-2">
              Bcc
              <Input
                id={`${fieldId}-bcc`}
                disabled={uploading}
                value={draft.bcc}
                onChange={(e) => patchDraft({ bcc: e.target.value })}
                className="h-8"
              />
            </label>
          </div>
        </div>
      )}
      {email && draft.quotedHtml && (
        <p className="mb-2 text-xs text-muted-foreground">
          The original email is included below your reply.
          <button
            type="button"
            className="ms-2 font-medium text-primary hover:underline"
            disabled={uploading}
            onClick={() => patchDraft({ quotedHtml: "" })}
          >
            Remove quoted content
          </button>
        </p>
      )}
      {email && draft.forwardedAttachments.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Forwarded attachments">
          {draft.forwardedAttachments.map((file, index) => (
            <li
              key={index}
              className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2 py-1 text-xs"
            >
              <span className="font-medium">{file.mediaLabel ?? file.mediaName}</span>
              <button
                type="button"
                disabled={uploading}
                aria-label={`Remove forwarded ${file.mediaLabel ?? file.mediaName}`}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                onClick={() =>
                  patchDraft({
                    forwardedAttachments: draft.forwardedAttachments.filter((_, i) => i !== index),
                  })
                }
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {refinement?.key === draftKey && (
        <div
          className="mb-2 rounded-xl border border-primary/30 bg-primary-soft/40 p-3 text-sm"
          role="region"
          aria-label="Refined message preview"
        >
          <p className="whitespace-pre-wrap">{refinement.text}</p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              disabled={text !== refinement.original}
              onClick={() => {
                setText(refinement.text);
                setRefinement(null);
              }}
            >
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRefinement(null)}>
              Discard
            </Button>
          </div>
        </div>
      )}
      {draft.files.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Pending attachments">
          {draft.files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex max-w-full items-center gap-1.5 rounded-xl border border-border/80 bg-surface-2/70 px-2.5 py-1 text-xs shadow-2xs"
            >
              <Paperclip className="size-3.5 shrink-0 text-primary" />
              <span className="max-w-40 truncate font-medium">{file.name}</span>
              <span className="py-0.2 rounded bg-muted px-1 text-[10px] text-muted-foreground">
                {Math.ceil(file.size / 1024)} KB
              </span>
              <button
                type="button"
                disabled={uploading}
                aria-label={`Remove ${file.name}`}
                className="ms-0.5 rounded p-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => patchDraft({ files: draft.files.filter((_, i) => i !== index) })}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        {email ? (
          <EmailEditor
            key={draftKey}
            html={draft.richHtml}
            text={text}
            images={draft.inlineImages}
            disabled={blocked || uploading}
            spellCheck={settings.spellCheck}
            allowImages={settings.fileSharing}
            onChange={({ html, text, images }) => patchDraft({ richHtml: html, text, inlineImages: images })}
            onSend={() => void send()}
          />
        ) : (
          <div className="flex flex-col">
            {spelling.suggestions}
            <div className={cn("relative", spelling.active && "rounded-lg")}>
              {spelling.overlay}
              <Textarea
                ref={area}
                aria-label={t("workspace.message-input")}
                value={text}
                disabled={blocked || uploading}
                spellCheck={spelling.textareaProps.spellCheck}
                onSelect={spelling.textareaProps.onSelect}
                onScroll={spelling.textareaProps.onScroll}
                rows={1}
                placeholder={placeholder}
                className={cn(
                  "max-h-40 min-h-9 resize-none rounded-lg border-0 bg-transparent px-1.5 py-1.5 text-sm shadow-none placeholder:text-muted-foreground/70 hover:border-0 focus-visible:ring-0 dark:bg-transparent",
                  spelling.textareaProps.className,
                )}
                onChange={(e) => {
                  setText(e.target.value);
                  if (!blocked && e.target.value.trim()) sendTyping(conversation.conversationId, whisper);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                onPaste={(e) => {
                  const files = [...e.clipboardData.files];
                  if (!files.length || !settings.fileSharing) return;
                  e.preventDefault();
                  if (blocked) return;
                  queueFiles(files);
                }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 pt-1.5">
          {settings.messageFormatting && !email && (
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                aria-label={t("workspace.bold")}
                disabled={blocked}
                onClick={() => applyFormat("*")}
              >
                <Bold className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                aria-label={t("workspace.italic")}
                disabled={blocked}
                onClick={() => applyFormat("_")}
              >
                <Italic className="size-3.5" />
              </Button>
            </div>
          )}
          {settings.emojis && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  aria-label={t("workspace.emoji")}
                  disabled={blocked}
                >
                  <Smile className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 shadow-lg" align="start">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="rounded-lg p-1 text-lg transition-transform hover:scale-110 hover:bg-surface-2"
                      onClick={() => setText((v) => v + emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {/* AI refine: only when switched on, an LLM service is configured and there is text (source). */}
          {settings.textRefine && Boolean(getConfig().LLM_CONNECTOR_URL) && (text.trim() || refining) && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              disabled={blocked || refining || !text.trim()}
              aria-label={t("chat-features.interactions.refine")}
              title={t("chat-features.interactions.refine")}
              onClick={() => {
                setRefining(true);
                void refineText(text)
                  .then((next) => next && setRefinement({ key: draftKey, original: text, text: next }))
                  .catch((error: unknown) => toast.error(String(error)))
                  .finally(() => setRefining(false));
              }}
            >
              {refining ? (
                <Loader2 className="size-3.5 animate-spin text-primary" />
              ) : (
                <Sparkles className="size-3.5 text-primary" />
              )}
            </Button>
          )}
          <QuickRepliesButton
            disabled={blocked}
            onPick={(message) => setText((current) => (current ? `${current} ${message}` : message))}
          />
          {email && signature && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              disabled={blocked}
              aria-label={t("chat-features.interactions.insert-signature")}
              title={t("chat-features.interactions.insert-signature")}
              onClick={() => setText((value) => `${value}\n\n${signature.replace(/<[^>]+>/g, "")}`)}
            >
              <PenLine className="size-3.5" />
            </Button>
          )}
          {settings?.secureLink && isSecureLinkConfigured() && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              disabled={blocked}
              aria-label={t("chat-features.interactions.secure-video-link")}
              title={t("chat-features.interactions.secure-video-link")}
              onClick={() => {
                const extension = user?.attributes?.agentExtension?.[0];
                const password = getVoicePassword();
                if (!user || !extension || !password || !session) {
                  toast.error(t("snackbar.No-Extension-Found"));
                  return;
                }
                void createSecureVideoLink({
                  agentId: user.username,
                  agentName: user.username,
                  agentExtension: extension,
                  customerId: conversation.customer._id,
                  customerName:
                    [conversation.customer.firstName, conversation.customer.lastName]
                      .filter(Boolean)
                      .join(" ") || user.username,
                  agentPassword: password,
                  conversationId: conversation.conversationId,
                  channelSession: session,
                  serviceIdentifier: session.channel.serviceIdentifier,
                })
                  .then((response) => {
                    if (response.secureLink) {
                      setText((value) => `${value}${value ? "\n" : ""}${response.secureLink}`);
                      toast.success(t("chat-features.interactions.secure-video-link"));
                    }
                  })
                  .catch((error: unknown) => toast.error(String(error)));
              }}
            >
              <Video className="size-3.5" />
            </Button>
          )}
          {settings.fileSharing && (
            <>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                aria-label={t("workspace.attach")}
                title={t("workspace.attach")}
                disabled={blocked || uploading || commentAttachmentsBlocked || Boolean(editMessageId)}
                onClick={() => fileInput.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Paperclip className="size-3.5" />
                )}
              </Button>
              <input
                ref={fileInput}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])];
                  e.target.value = "";
                  if (!files.length) return;
                  queueFiles(files);
                }}
              />
            </>
          )}
          {canWhisper && (
            <label
              className={cn(
                "ms-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors select-none",
                whisper
                  ? "bg-amber-500/15 font-semibold text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title={t("workspace.whisper-hint")}
            >
              <Switch
                checked={whisper}
                onCheckedChange={setWhisper}
                disabled={
                  blocked ||
                  email ||
                  !canWhisper ||
                  Boolean(editMessageId) ||
                  conversation.topicParticipant.role === "ASSISTANT"
                }
                aria-label={t("chat-features.interactions.whisper")}
              />
              <Lock className="size-3 shrink-0" />
              <span>{t("chat-features.interactions.whisper")}</span>
            </label>
          )}

          <div className="ms-auto flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              className={cn(
                "h-7 gap-1.5 rounded-full px-3 text-xs font-semibold shadow-xs transition-all",
                whisper
                  ? "bg-amber-600 text-white shadow-amber-500/20 hover:bg-amber-700"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
              disabled={
                blocked ||
                uploading ||
                (!text.trim() &&
                  !draft.files.length &&
                  !draft.forwardedAttachments.length &&
                  !(email && /data-inline-id=/.test(draft.richHtml)))
              }
              onClick={send}
              aria-label={t("chat-features.interactions.send")}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <>
                  <span>{whisper ? "Whisper" : t("chat-features.interactions.send")}</span>
                  <Send className="size-3" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One reply-channel choice; the customer identifier is PII and shown masked. */
function ChannelChoice({
  conversation,
  session,
  ambiguous,
  disabled,
}: {
  conversation: Conversation;
  session: ChannelSession;
  ambiguous: boolean;
  disabled: boolean;
}) {
  const name = session.channel.channelType.name;
  const identifier = useMaskedValue(
    session.channelData.channelCustomerIdentifier,
    name.toLowerCase() === "email" ? "email" : "phoneNumber",
    conversation.roomInfo === "FAKE_CONVERSATION" ? "manage" : "manage_in_conversation",
  );
  return (
    <button
      type="button"
      role="radio"
      aria-label={ambiguous && identifier ? `${name} ${identifier}` : name}
      aria-checked={Boolean(session.isChecked)}
      disabled={disabled}
      onClick={() =>
        useConversationStore.getState().selectReplySession(conversation.conversationId, session.id)
      }
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
        session.isChecked
          ? "bg-surface font-semibold text-foreground shadow-2xs ring-1 ring-border/70"
          : "text-muted-foreground hover:bg-surface/50 hover:text-foreground",
        session.isDisabled && "opacity-50",
      )}
    >
      <ChannelBadge channelType={session.channel.channelType} size="sm" className="-ms-1.5" />
      <span>{name}</span>
      {identifier && (
        <span className="truncate tabular-nums opacity-75" aria-hidden={!ambiguous}>
          ({identifier})
        </span>
      )}
    </button>
  );
}
