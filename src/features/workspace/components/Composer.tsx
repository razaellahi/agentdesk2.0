import { Bold, Italic, Loader2, Paperclip, Send, Smile } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDeskSettings } from "@/core/agent-settings";
import { cn } from "@/shared/lib/utils";
import { sendFiles, sendText } from "../session/actions";
import type { Conversation } from "../model/types";
import { ChannelIcon } from "./ChannelIcon";
import { useConversationStore } from "../store/conversationStore";

const EMOJIS = "😀 😁 😂 😊 😍 😎 😢 😡 👍 👎 🙏 🎉 ✅ ❌ ❤️ 🔥 👋 🤔 📎 ⭐".split(" ");

function wrapSelection(value: string, start: number, end: number, marker: string) {
  const selected = value.slice(start, end) || "text";
  return {
    next: value.slice(0, start) + marker + selected + marker + value.slice(end),
    cursor: start + marker.length + selected.length + marker.length,
  };
}

/** Reply box: text, formatting, emoji, attachments, whisper and channel choice. */
export function Composer({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation();
  const settings = useDeskSettings();
  const [text, setText] = useState("");
  const [whisper, setWhisper] = useState(conversation.topicParticipant.role === "WHISPER");
  const [uploading, setUploading] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const sessions = conversation.activeChannelSessions.filter((s) => !s.isDisabled);
  const blocked =
    !conversation.composerEnabled ||
    conversation.hold.active ||
    conversation.wrapUp.show ||
    conversation.state !== "ACTIVE";

  const send = () => {
    if (blocked || !text.trim()) return;
    const ok = sendText(conversation.conversationId, text, { whisper });
    if (ok) setText("");
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

  return (
    <div className="border-t bg-surface p-3">
      {sessions.length > 1 && (
        <div
          className="mb-2 flex flex-wrap gap-1"
          role="radiogroup"
          aria-label={t("chat-features.interactions.selected-channel")}
        >
          {conversation.activeChannelSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              role="radio"
              aria-checked={Boolean(session.isChecked)}
              disabled={session.isDisabled || blocked}
              onClick={() =>
                useConversationStore.getState().selectReplySession(conversation.conversationId, session.id)
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                session.isChecked ? "border-primary bg-primary-soft text-primary" : "text-medium",
                session.isDisabled && "opacity-50",
              )}
            >
              <ChannelIcon channelType={session.channel.channelType} className="size-3.5" />
              {session.channel.channelType.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1">
            {settings.messageFormatting && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={t("workspace.bold")}
                  disabled={blocked}
                  onClick={() => applyFormat("*")}
                >
                  <Bold className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={t("workspace.italic")}
                  disabled={blocked}
                  onClick={() => applyFormat("_")}
                >
                  <Italic className="size-4" />
                </Button>
              </>
            )}
            {settings.emojis && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label={t("workspace.emoji")}
                    disabled={blocked}
                  >
                    <Smile className="size-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="rounded p-1 text-lg hover:bg-surface-2"
                        onClick={() => setText((v) => v + emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {settings.fileSharing && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={t("workspace.attach")}
                  disabled={blocked || uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
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
                    setUploading(true);
                    void sendFiles(conversation.conversationId, files, { whisper }).finally(() =>
                      setUploading(false),
                    );
                  }}
                />
              </>
            )}
            <label className="ms-auto flex items-center gap-1.5 text-xs text-medium">
              <Switch
                checked={whisper}
                onCheckedChange={setWhisper}
                disabled={blocked}
                aria-label={t("chat-features.interactions.whisper")}
              />
              {t("chat-features.interactions.whisper")}
            </label>
          </div>
          <Textarea
            ref={area}
            value={text}
            disabled={blocked}
            spellCheck={settings.spellCheck}
            rows={2}
            placeholder={
              whisper
                ? t("chat-features.interactions.Type-a-whisper-message")
                : t("chat-features.interactions.Type-a-message")
            }
            className="min-h-16 resize-none"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            onPaste={(e) => {
              const files = [...e.clipboardData.files];
              if (!files.length || !settings.fileSharing) return;
              e.preventDefault();
              if (blocked) return;
              setUploading(true);
              void sendFiles(conversation.conversationId, files, { whisper })
                .catch((error: unknown) => toast.error(String(error)))
                .finally(() => setUploading(false));
            }}
          />
        </div>
        <Button
          type="button"
          className="mb-0.5"
          disabled={blocked || !text.trim()}
          onClick={send}
          aria-label={t("chat-features.interactions.send")}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
