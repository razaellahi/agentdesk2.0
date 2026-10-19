/** Reporting responses are a list of queues, each holding the chats in that queue. */
export interface ChatBucket {
  queueId?: string;
  queueName?: string;
  chats?: ChatRow[];
}

export interface ChatRow {
  conversationId?: string;
  customerName?: string;
  channelIdentity?: string;
  conversationState?: string;
  activeSince?: number;
  waitingSince?: number;
  direction?: string;
  queueName?: string;
  agentDetails?: { name?: string; userName?: string }[];
  agentHandRaise?: { handRaised?: boolean };
  activeChannelSessions?: {
    id?: string;
    conversationId?: string;
    roomInfo?: unknown;
    channel?: { channelType?: { name?: string }; serviceIdentifier?: string };
    channelData?: {
      channelCustomerIdentifier?: string;
      serviceIdentifier?: string;
      additionalAttributes?: { key?: string; value?: string }[];
    };
    dialogId?: string;
  }[];
  channelType?: string;
  botName?: string;
}

export interface AgentRow {
  id: string;
  name: string;
  state: string;
  activeChatsCount?: number;
  mrds?: { id: string; state?: string }[];
}

export interface Mrd {
  id: string;
  name: string;
}

export function asArray<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object") {
    const record = body as { docs?: T[]; data?: T[] };
    if (Array.isArray(record.docs)) return record.docs;
    if (Array.isArray(record.data)) return record.data;
  }
  return [];
}

export function chatsFromBuckets(buckets: ChatBucket[] | null | undefined, state = "ALL"): ChatRow[] {
  if (!Array.isArray(buckets)) return [];
  return buckets.flatMap((bucket) =>
    (bucket.chats ?? [])
      .filter((chat) => state === "ALL" || chat.conversationState === state)
      .map((chat) => ({ ...chat, queueName: chat.queueName || bucket.queueName })),
  );
}

export function sortBySeconds(rows: ChatRow[], field: "activeSince" | "waitingSince", order: "asc" | "desc") {
  const sign = order === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => ((a[field] ?? 0) - (b[field] ?? 0)) * sign);
}

export function agentNames(chat: ChatRow): string {
  return (chat.agentDetails ?? [])
    .map((agent) => agent.name || agent.userName)
    .filter(Boolean)
    .join(", ");
}

export function matchesAgentSearch(chat: ChatRow, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  const haystack = (chat.agentDetails ?? [])
    .flatMap((agent) => [agent.name, agent.userName])
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}
