import { cimCustomerApi } from "@/core/api";
import { linkConversationCustomer } from "../api";
import { useConversationStore } from "../store/conversationStore";

/**
 * After a profile edit, brings every open conversation of that customer up to date and
 * tells the conversation manager (UA customer-info refresh), so the panel, the header
 * and a re-opened form show what was just saved instead of the old profile.
 */
export async function refreshConversationCustomer(customerId: string, conversationId?: string) {
  const body = await cimCustomerApi.get<Record<string, unknown> | { docs?: Record<string, unknown>[] }>(
    `/customers/${encodeURIComponent(customerId)}`,
  );
  // The customer API answers with the document, or a one-item page of them.
  const fresh: Record<string, unknown> | undefined =
    body && "docs" in body ? (body as { docs?: Record<string, unknown>[] }).docs?.[0] : body;
  if (!fresh || typeof fresh !== "object") return;
  const store = useConversationStore.getState();
  for (const conversation of Object.values(store.byId)) {
    if (conversation.customer._id === customerId)
      store.setCustomer(conversation.conversationId, fresh as typeof conversation.customer);
  }
  if (conversationId) await linkConversationCustomer(conversationId, fresh).catch(() => undefined);
}
