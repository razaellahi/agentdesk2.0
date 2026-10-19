import { conversationManagerApi } from "@/core/api";
import { can } from "@/core/auth";
import type { CimEvent } from "../model/types";
import { useConversationStore } from "../store/conversationStore";
/** The server's activities as an array of objects, whatever shape it answered with. */
function activitiesOf(body: unknown): CimEvent[] {
  const docs = Array.isArray(body) ? body : (body as { docs?: unknown } | null | undefined)?.docs;
  return Array.isArray(docs)
    ? docs.filter(
        (event): event is CimEvent => Boolean(event) && typeof event === "object" && !Array.isArray(event),
      )
    : [];
}

export async function loadPastActivities(customerId: string, page: number, signal?: AbortSignal) {
  const activeCustomer = Object.values(useConversationStore.getState().byId).some(
    (conversation) => conversation.customer._id === customerId && conversation.state === "ACTIVE",
  );
  if (!can("history") && !(can("customerHistory") && activeCustomer))
    throw new Error("History permission is required for this customer.");
  const body = await conversationManagerApi.get<unknown>(
    `/customer-topics/customer/${encodeURIComponent(customerId)}/activities`,
    { signal, searchParams: { limit: 50, offset: page, "activity-type": "ALL", decode: false } },
  );
  return activitiesOf(body);
}
export async function loadConversationActivities(conversationId: string, signal?: AbortSignal) {
  if (!can("history")) throw new Error("History permission is required.");
  const body = await conversationManagerApi.get<unknown>(
    `/customer-topics/${encodeURIComponent(conversationId)}/activities`,
    { signal, searchParams: { "activity-type": "ALL", decode: false } },
  );
  return activitiesOf(body);
}
