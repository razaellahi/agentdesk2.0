import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getSession, usePermission } from "@/core/auth";
import { historyConversation } from "../model/history";
import { loadConversationActivities, loadPastActivities } from "../api/history";
import type { Customer } from "../model/types";
import { MessageBoundary } from "./messages/MessageBoundary";
import { MessageStream } from "./messages/MessageStream";
export function HistoryDialog({
  customer,
  conversationId,
  onClose,
}: {
  customer?: Customer;
  conversationId?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const user = getSession().user;
  const canHistory = usePermission("history"),
    canCustomerHistory = usePermission("customerHistory");
  const permitted = Boolean(
    user && (conversationId ? canHistory : (canHistory || canCustomerHistory) && customer?._id),
  );
  const query = useInfiniteQuery({
    queryKey: ["history-activities", user?.id, conversationId ?? customer?._id],
    initialPageParam: 0,
    enabled: permitted,
    queryFn: ({ pageParam, signal }) =>
      conversationId
        ? loadConversationActivities(conversationId, signal)
        : loadPastActivities(customer!._id, pageParam, signal),
    getNextPageParam: (last, _pages, lastParam) =>
      !conversationId && last.length ? lastParam + 1 : undefined,
  });
  const conversation = useMemo(() => {
    if (!user) return null;
    try {
      return historyConversation(
        query.data?.pages.flat() ?? [],
        customer ?? { _id: "" },
        { id: user.id, username: user.username, firstName: user.firstName ?? undefined },
        { agentId: user.id, agentUsername: user.username, t, now: query.dataUpdatedAt },
        conversationId ?? customer?._id ?? "unknown",
      );
    } catch {
      return null;
    }
  }, [query.data, query.dataUpdatedAt, customer, conversationId, user, t]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex h-[85vh] max-h-[900px] flex-col sm:max-w-3xl">
        <DialogTitle>Conversation history</DialogTitle>
        <DialogDescription>
          Read-only messages and activities{conversationId ? ` for ${conversationId}` : " for this customer"}.
        </DialogDescription>
        {!permitted ? (
          <p role="alert">You don’t have permission to view this history.</p>
        ) : (
          <>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs text-muted-foreground">
                {conversation?.messages.length ?? 0} messages
              </span>
              {query.hasNextPage && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  {query.isFetchingNextPage ? "Loading…" : "Load older activities"}
                </Button>
              )}
            </div>
            {query.isPending && <p role="status">Loading history…</p>}
            {query.isError && (
              <p role="alert" className="text-sm text-destructive-text">
                {query.error.message}
                <Button variant="ghost" onClick={() => void query.refetch()}>
                  Retry
                </Button>
              </p>
            )}
            <div className="min-h-0 flex-1">
              {conversation ? (
                <MessageBoundary
                  messageId={`history:${conversation.conversationId}:${conversation.messages.length}`}
                  fallback={<p role="alert">{t("workspace.history-unavailable")}</p>}
                >
                  <MessageStream conversation={conversation} />
                </MessageBoundary>
              ) : (
                !query.isPending && <p role="alert">{t("workspace.history-unavailable")}</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
