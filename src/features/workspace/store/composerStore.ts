import { create } from "zustand";
import type { Conversation } from "../model/types";
import type { EmailAttachment, InlineEmailImage } from "../model/email";
import { plainEmailHtml, revokeInlineImages } from "../model/emailEditor";

export interface ComposerDraft {
  text: string;
  richHtml: string;
  inlineImages: InlineEmailImage[];
  files: File[];
  sending: boolean;
  subject: string;
  emailMode: "REPLY_TO" | "REPLY_ALL" | "FORWARD";
  to: string;
  cc: string;
  bcc: string;
  emailInitialized: boolean;
  emailThreads: string[];
  quotedHtml: string;
  forwardedAttachments: EmailAttachment[];
  whisper: boolean | undefined;
  privateReply: boolean;
  replyToId: string | null;
  editMessageId: string | null;
  editSeed: string | null;
  insertRequest: string | null;
}
export const EMPTY_DRAFT: Readonly<ComposerDraft> = Object.freeze({
  text: "",
  richHtml: "",
  inlineImages: [],
  files: [],
  sending: false,
  subject: "",
  emailMode: "REPLY_TO",
  to: "",
  cc: "",
  bcc: "",
  emailInitialized: false,
  emailThreads: [],
  quotedHtml: "",
  forwardedAttachments: [],
  whisper: undefined,
  privateReply: false,
  replyToId: null,
  editMessageId: null,
  editSeed: null,
  insertRequest: null,
});
/** Memory only: drafts contain customer data and must never outlive the identity session. */
export function composerKey(conversation: Conversation): string {
  const session =
    conversation.activeChannelSessions.find((s) => s.isChecked) ??
    conversation.activeChannelSessions.find((s) => !s.isDisabled);
  return JSON.stringify([conversation.conversationId, session?.id ?? ""]);
}
interface ComposerState {
  drafts: Record<string, ComposerDraft>;
  patch: (key: string, patch: Partial<ComposerDraft>) => void;
  setReplyTo: (key: string, messageId: string | null) => void;
  setEdit: (key: string, messageId: string | null, text?: string | null) => void;
  insertText: (key: string, text: string) => void;
  clearInsert: (key: string) => void;
  reset: () => void;
}
export const useComposerStore = create<ComposerState>()((set, get) => ({
  drafts: {},
  patch: (key, patch) => {
    if (patch.inlineImages)
      revokeInlineImages(
        (get().drafts[key]?.inlineImages ?? []).filter(
          (image) => !patch.inlineImages!.some((next) => next.id === image.id),
        ),
      );
    set((s) => ({ drafts: { ...s.drafts, [key]: { ...EMPTY_DRAFT, ...s.drafts[key], ...patch } } }));
  },
  setReplyTo: (key, replyToId) =>
    get().patch(key, { replyToId, editMessageId: null, editSeed: null, privateReply: false }),
  setEdit: (key, editMessageId, editSeed = null) =>
    get().patch(key, {
      editMessageId,
      editSeed,
      replyToId: null,
      privateReply: false,
      ...(editSeed != null ? { text: editSeed } : {}),
    }),
  insertText: (key, chunk) => {
    const draft = get().drafts[key] ?? EMPTY_DRAFT;
    get().patch(key, {
      text: draft.text ? `${draft.text}\n${chunk}` : chunk,
      richHtml: draft.richHtml ? `${draft.richHtml}<br>${plainEmailHtml(chunk)}` : "",
    });
  },
  clearInsert: (key) => get().patch(key, { insertRequest: null }),
  reset: () => {
    for (const draft of Object.values(get().drafts)) revokeInlineImages(draft.inlineImages);
    set({ drafts: {} });
  },
}));
