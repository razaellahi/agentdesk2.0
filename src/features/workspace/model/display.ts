import { lower } from "./systemMessages";
import { messageText } from "./outgoing";
import type { CimMessage, Conversation, SlaColor } from "./types";

export function customerDisplayName(c: Conversation["customer"] | undefined): string {
  return (c?.firstName ?? "").trim();
}

/** One-line preview of the last visible message for the conversation rail. */
export function lastMessagePreview(
  messages: CimMessage[],
  t: (k: string, p?: Record<string, unknown>) => string,
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    const type = lower(m.body.type);
    if (type === "systemnotification" || type === "wrapup") continue;
    if (type === "plain" || type === "url" || (type === "comment" && lower(m.body.itemType) === "text")) {
      const text = messageText(m).replace(/\s+/g, " ").trim();
      if (text)
        return (
          (lower(m.header.sender?.type) === "agent" ? `${t("chat-features.interactions.you")}: ` : "") + text
        );
    }
    return t("workspace.preview-attachment", { type: lower(m.body.type) });
  }
  return "";
}

export const slaRingClass: Record<SlaColor, string> = {
  "sla-normal": "ring-success",
  "sla-warn": "ring-warning",
  "sla-red": "ring-destructive",
  "sla-ended": "ring-destructive",
};

/** Waiting severity from the mockup: amber from 1 min, red from 2 min. */
export function waitingLevel(seconds: number | null): "ok" | "warn" | "breach" | null {
  if (seconds === null) return null;
  if (seconds >= 120) return "breach";
  if (seconds >= 60) return "warn";
  return "ok";
}
