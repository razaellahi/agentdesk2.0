import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { getCustomer } from "@/features/customers";
import { startConversationFromCustomer } from "../linking/startConversation";
import type { Conversation } from "../model/types";
import { useTranscriptFocus } from "../store/transcriptFocus";

/**
 * `/conversations?customer=<id>&name=<name>&at=<ISO or epoch ms>`: opens that customer's conversation
 * view and brings the message nearest `at` into view. This is how a case opens the conversation it was
 * raised from, without the cases feature depending on the workspace.
 */
export function useOpenFromLink() {
  const [params, setParams] = useSearchParams();
  const customerId = params.get("customer");
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    const name = params.get("name") ?? "";
    const raw = params.get("at");
    const key = `${customerId}:${raw ?? ""}`;
    if (handled.current === key) return;
    handled.current = key;
    const at = raw ? (Number.isFinite(Number(raw)) ? Number(raw) : Date.parse(raw)) : Number.NaN;
    setParams({}, { replace: true });
    void getCustomer(customerId)
      .catch(() => null)
      .then((row) => {
        const customer = { ...(row ?? {}), _id: customerId } as Conversation["customer"];
        if (!customer.firstName && name) customer.firstName = name;
        const conversationId = startConversationFromCustomer(customer);
        if (Number.isFinite(at)) useTranscriptFocus.getState().focus({ conversationId, at });
      });
  }, [customerId, params, setParams]);
}
