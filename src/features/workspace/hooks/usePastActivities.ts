import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getSession, usePermission } from "@/core/auth";
import { createLogger } from "@/core/logging/logger";
import { loadPastActivities } from "../api/history";
import { historyConversation } from "../model/history";
import type { CimMessage, Conversation } from "../model/types";

const log = createLogger("history");

export type PastActivitiesStatus = "hidden" | "idle" | "loading" | "end" | "error";

export interface PastActivities {
  /** Older messages to show before the conversation's own, oldest first. */
  messages: CimMessage[];
  status: PastActivitiesStatus;
  error: string | null;
  loadMore: () => void;
}

/**
 * The customer's past activities inside a conversation transcript (unified-agent
 * interactions loadPastActivities). A conversation opened from the phonebook
 * (FAKE_CONVERSATION) loads the first page straight away; live conversations
 * load on request. "view_history" allows both; "view_history_active_customer"
 * only allows live conversations.
 */
export function usePastActivities(
  conversation: Conversation | null | undefined,
  { announce = true }: { announce?: boolean } = {},
): PastActivities {
  const { t } = useTranslation();
  const user = getSession().user;
  const fake = conversation?.roomInfo === "FAKE_CONVERSATION";
  const canHistory = usePermission("history");
  const canCustomerHistory = usePermission("customerHistory");
  const customer = conversation?.customer;
  const customerId = customer?._id;
  const allowed = Boolean(user && customerId && (canHistory || (!fake && canCustomerHistory)));
  const [asked, setAsked] = useState(false);
  const requested = fake || asked;

  const query = useInfiniteQuery({
    queryKey: ["past-activities", user?.id, customerId],
    enabled: allowed && requested,
    initialPageParam: 0,
    // The transcript keeps its place while live messages arrive; pages are only added on request.
    staleTime: Infinity,
    queryFn: ({ pageParam, signal }) => loadPastActivities(customerId!, pageParam, signal),
    getNextPageParam: (last, _pages, lastParam) => (last.length ? lastParam + 1 : undefined),
  });

  // As before: a phonebook conversation with no history says so once.
  const announced = useRef(false);
  const firstPage = query.data?.pages[0];
  useEffect(() => {
    if (!announce || !fake || announced.current || !firstPage || firstPage.length) return;
    announced.current = true;
    toast.info(t("snackbar.No-Conversation-Found"));
  }, [announce, fake, firstPage, t]);

  const own = conversation?.messages;
  const messages = useMemo(() => {
    const pages = query.data?.pages;
    if (!pages?.length || !user || !customer) return [];
    let history: CimMessage[];
    try {
      history = historyConversation(
        pages.flat(),
        customer,
        { id: user.id, username: user.username, firstName: user.firstName ?? undefined },
        { agentId: user.id, agentUsername: user.username, t, now: query.dataUpdatedAt },
      ).messages;
    } catch (error) {
      // History is an extra: if it cannot be built, the live conversation must still open.
      log.error("past activities could not be built", error);
      return [];
    }
    const shown = new Set((own ?? []).map((message) => message.id));
    return history.filter((message) => !shown.has(message.id));
  }, [query.data, query.dataUpdatedAt, own, user, customer, t]);

  const status: PastActivitiesStatus = !allowed
    ? "hidden"
    : query.isFetching
      ? "loading"
      : query.isError
        ? "error"
        : query.data && !query.hasNextPage
          ? "end"
          : "idle";

  return {
    messages,
    status,
    error: query.error?.message ?? null,
    loadMore: () => {
      if (!requested) setAsked(true);
      else if (!query.data) void query.refetch();
      else void query.fetchNextPage();
    },
  };
}
