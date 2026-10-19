import { lower } from "./systemMessages";
import { messageText } from "./outgoing";
import type { CimMessage, Conversation, SlaColor } from "./types";

export function customerDisplayName(c: Conversation["customer"] | undefined): string {
  if (!c) return "";
  return [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
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

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  WEB: "Web chat",
  SMS: "SMS",
  EMAIL: "Email",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TWITTER: "X (Twitter)",
  LINKEDIN: "LinkedIn",
  YOUTUBE: "YouTube",
  TELEGRAM: "Telegram",
  VIBER: "Viber",
  PLAY_STORE: "Play Store",
  APPLE_STORE: "App Store",
  CX_VOICE: "Voice",
  CISCO_CC: "Voice",
  WEB_RTC: "Video",
};

/** Friendly channel-type name for people ("WHATSAPP" → "WhatsApp"); unknown types are tidied. */
export function channelLabel(name: string | undefined | null): string {
  const key = (name ?? "").trim().toUpperCase();
  if (!key) return "";
  return (
    CHANNEL_LABELS[key] ??
    key
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}
