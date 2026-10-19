/** Helpers for conversation-data / sentiment / summary (UA processConversationData). */

export type Sentiment = "positive" | "negative" | "neutral";

export interface ConversationDataRow {
  key: string;
  value: unknown;
}

export interface ConversationInsight {
  sentiment: Sentiment | null;
  summary: { heading?: string; content?: string } | null;
  rows: ConversationDataRow[];
}

function asList(data: unknown): { key?: string; value?: unknown }[] {
  if (Array.isArray(data)) return data as { key?: string; value?: unknown }[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown[] }).data)) {
    return (data as { data: { key?: string; value?: unknown }[] }).data;
  }
  return [];
}

export function parseConversationInsight(data: unknown): ConversationInsight {
  let sentiment: Sentiment | null = null;
  let summary: ConversationInsight["summary"] = null;
  const rows: ConversationDataRow[] = [];

  for (const element of asList(data)) {
    const key = String(element.key ?? "");
    if (!key) continue;
    if (key === "CONVERSATION_SUMMARY") {
      try {
        const parsed =
          typeof element.value === "string" ? JSON.parse(element.value) : (element.value as object);
        const row = parsed as { heading?: string; content?: string };
        summary = { heading: row.heading, content: row.content };
      } catch {
        summary = { content: String(element.value ?? "") };
      }
      continue;
    }
    if (key === "CUSTOMER_SENTIMENTS") {
      const value = String(element.value ?? "").toLowerCase();
      sentiment = value === "positive" || value === "negative" || value === "neutral" ? value : "neutral";
      continue;
    }
    rows.push({ key, value: element.value });
  }

  return { sentiment, summary, rows };
}

export function formatDataValue(value: unknown) {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
