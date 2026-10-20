import { lower } from "./systemMessages";
import type { CimMessage } from "./types";

const ENTITIES: [RegExp, string][] = [
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&quot;/g, '"'],
  [/&#039;/g, "'"],
  [/&#x2F;/g, "/"],
  [/&#x60;/g, "`"],
  [/&amp;/g, "&"],
];

/** The reply text of one bot suggestion (unified-agent's messageBody + decodeBase64 pipe). */
export function suggestionText(suggestion: unknown): string {
  const record = suggestion as {
    text?: unknown;
    messageBody?: { markdownText?: unknown };
    header?: { additionalData?: { isEncoded?: boolean } };
  };
  if (typeof record?.text === "string") return record.text;
  const raw = record?.messageBody?.markdownText;
  if (typeof raw !== "string" || !raw) return "";
  const unescaped = ENTITIES.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), raw);
  if (!record.header?.additionalData?.isEncoded) return unescaped;
  try {
    const bytes = Uint8Array.from(atob(unescaped), (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return unescaped;
  }
}

/**
 * Bot suggestions for the agent's next reply: the ones on the last customer message that has any,
 * so they stay up after the agent answers (unified-agent's lastCustomerMessageSuggestions pipe).
 */
export function lastCustomerSuggestions(messages: CimMessage[]): unknown[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message) continue;
    if (lower(message.header?.sender?.type) === "customer" && (message.botSuggestions?.length ?? 0) > 0)
      return message.botSuggestions ?? [];
  }
  return [];
}
