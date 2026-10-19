import type { CimEvent, Conversation, Customer, KeycloakUserRef, TopicParticipant } from "./types";
import { buildConversation, type ModelContext } from "./conversation";
export function historyConversation(
  events: CimEvent[],
  customer: Customer,
  user: KeycloakUserRef,
  ctx: ModelContext,
  identity = customer._id || "unknown",
): Conversation {
  const historyId = `history:${identity}`;
  const participant: TopicParticipant = {
    id: "history",
    type: "AGENT",
    participant: { id: user.id, participantType: "CCUser", keycloakUser: user },
    token: null,
    conversationId: historyId,
    role: "SILENT_MONITOR",
    userCredentials: null,
    state: "UNSUBSCRIBED",
  };
  const unique = [
    ...new Map(
      events
        .filter((event) => Boolean(event) && typeof event === "object")
        .map((event, index) => [
          event.id ?? `${event.name}:${event.data?.id ?? index}:${event.timestamp ?? ""}`,
          event,
        ]),
    ).values(),
  ];
  unique.sort(
    (a, b) =>
      Number(a.timestamp ?? a.data?.header?.timestamp ?? 0) -
      Number(b.timestamp ?? b.data?.header?.timestamp ?? 0),
  );
  const candidates = unique.filter((event) => typeof event.name === "string" && event.data);
  const topicData = (events: CimEvent[]) => ({
    conversationId: historyId,
    roomInfo: "FAKE_CONVERSATION" as const,
    taskId: "",
    topicData: {
      topicParticipant: participant,
      customer,
      topicEvents: structuredClone(events),
    },
  });
  const build = (events: CimEvent[]) => {
    const fallback = events.find((event) => event.data?.header?.customer?._id)?.data.header.customer;
    const payload = topicData(events);
    payload.topicData.customer = customer._id ? customer : (fallback ?? customer);
    return buildConversation(payload, ctx, 0);
  };
  // Past activities come from the server in every shape it has ever stored. A single
  // malformed event must cost that event, not the whole history.
  let conversation: Conversation;
  try {
    conversation = build(candidates);
  } catch {
    conversation = build(
      candidates.filter((event) => {
        try {
          build([event]);
          return true;
        } catch {
          return false;
        }
      }),
    );
  }
  const messages = new Map(conversation.messages.map((message) => [message.id, message]));
  conversation.messages = [...messages.values()].sort(
    (a, b) => Number(a.header.timestamp ?? 0) - Number(b.header.timestamp ?? 0),
  );
  conversation.composerEnabled = false;
  conversation.state = "CLOSED";
  return conversation;
}
