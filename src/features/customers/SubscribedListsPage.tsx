import { useQuery } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { confirm } from "@/components/common/confirm";
import { DataTable, DataView, EmptyRow, Td, Th } from "@/components/common/DataView";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { unifiedAdminApi } from "@/core/api";
import { usePermission } from "@/core/auth";
import { formatRelative } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import { unwrapList } from "@/shared/lib/unwrap";
import {
  WORKSPACE_PATH,
  endPullModeRequest,
  joinPullModeRequest,
  setPullModeSubscription,
  useConversationStore,
  useMaskedValue,
  usePullModeStore,
  type ChannelSession,
  type PullModeList,
} from "@/features/workspace";

type StatusFilter = "all" | "active" | "inactive" | "created";

const STATUS_DOT: Record<string, string> = {
  active: "bg-success",
  inactive: "bg-muted-foreground/50",
  on_hold: "bg-warning",
};

interface InboxRequest {
  id: string;
  listId: string;
  status?: string;
  time?: string | number;
  channelSession: ChannelSession & {
    customer?: { firstName?: string };
    channelData: { channelCustomerIdentifier?: string };
  };
}

function CustomerCell({ request }: { request: InboxRequest }) {
  const name = useMaskedValue(request.channelSession.customer?.firstName, "firstName", "manage");
  const identifier = useMaskedValue(
    request.channelSession.channelData?.channelCustomerIdentifier,
    "firstName",
    "manage",
  );
  return (
    <span className="min-w-0">
      <span className="font-medium">{name || "—"}</span>
      {identifier && (
        <span className="ms-1.5 text-xs text-muted-foreground tabular-nums">({identifier})</span>
      )}
    </span>
  );
}

/**
 * Pull-mode inbox (unified-agent subscribed-list + subscribed-list-preview):
 * waiting requests of the lists the agent subscribes to, filtered by status and
 * list. Joining takes the conversation; ending a request needs subscribed-list:manage.
 */
export default function SubscribedListsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canManage = usePermission("subscribedListsManage");
  const storeLists = usePullModeStore((s) => s.lists);
  const listNames = usePullModeStore((s) => s.listNames);
  const subscribed = usePullModeStore((s) => s.subscribed) as PullModeList[];
  const requests = usePullModeStore((s) => s.requests) as unknown as InboxRequest[];
  const joinedIds = useConversationStore((s) => s.byId);
  const [manageOpen, setManageOpen] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [listId, setListId] = useState("all");

  // The session loads the catalogue at sign-in; load it here too if that failed or is still running.
  const listsQuery = useQuery({
    queryKey: ["pull-mode-lists"],
    queryFn: async () => unwrapList<PullModeList>(await unifiedAdminApi.get("/pull-mode-list")),
    enabled: storeLists.length === 0,
  });
  useEffect(() => {
    if (listsQuery.data?.length && usePullModeStore.getState().lists.length === 0)
      usePullModeStore.getState().setLists(listsQuery.data);
  }, [listsQuery.data]);
  const lists = storeLists.length ? storeLists : (listsQuery.data ?? []);
  const subscribedIds = new Set(subscribed.map((list) => list.id));

  const rows = requests.filter((request) => {
    const state = String(request.status ?? "").toLowerCase();
    if (state === "wrap_up" || state === "customer_left") return false;
    if (listId !== "all" && request.listId !== listId) return false;
    if (status !== "all" && state !== status) return false;
    return true;
  });

  return (
    <DataView
      title={t("pull-mode.inbox")}
      toolbar={
        <>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("pull-mode.subscribed-lists")}:
            </span>
            {subscribed.length ? (
              subscribed.map((list) => (
                <span key={list.id} className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">
                  {list.name ?? listNames[list.id]}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger className="h-8 w-36" aria-label={t("pull-mode.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("pull-mode.all-chats")}</SelectItem>
              <SelectItem value="active">{t("pull-mode.active")}</SelectItem>
              <SelectItem value="inactive">{t("pull-mode.inactive")}</SelectItem>
              <SelectItem value="created">{t("pull-mode.unread")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={listId} onValueChange={setListId}>
            <SelectTrigger className="h-8 w-40" aria-label={t("pull-mode.list")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("pull-mode.all-list")}</SelectItem>
              {subscribed.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name ?? listNames[list.id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
            <ListChecks className="size-4" />
            {t("pull-mode.manage-subscriptions")}
          </Button>
        </>
      }
    >
      {listsQuery.isError && (
        <p role="alert" className="px-4 py-2 text-sm text-destructive-text">
          {listsQuery.error.message}
          <Button variant="ghost" size="sm" onClick={() => void listsQuery.refetch()}>
            {t("supervisor.retry")}
          </Button>
        </p>
      )}
      <DataTable>
        <thead>
          <tr>
            <Th className="w-16">{t("pull-mode.status")}</Th>
            <Th>{t("pull-mode.customer")}</Th>
            <Th>{t("pull-mode.time")}</Th>
            <Th>{t("pull-mode.list")}</Th>
            <Th className="w-40" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <EmptyRow>
              {subscribed.length ? t("globals.no-data-available") : t("workspace.pull-mode-subscribe-hint")}
            </EmptyRow>
          )}
          {rows.map((request) => {
            const state = String(request.status ?? "").toLowerCase();
            const joined = Boolean(
              joinedIds[request.id] ||
              (request.channelSession.conversationId &&
                joinedIds[String(request.channelSession.conversationId)]),
            );
            return (
              <tr key={request.id}>
                <Td>
                  <span
                    className={cn(
                      "inline-block size-2.5 rounded-full",
                      STATUS_DOT[state] ?? "bg-destructive",
                    )}
                    title={state === "created" ? t("pull-mode.UNREAD") : state.toUpperCase()}
                  />
                </Td>
                <Td>
                  <CustomerCell request={request} />
                  {joined && <span className="ms-2 text-xs text-success-text">{t("pull-mode.joined")}</span>}
                </Td>
                <Td className="text-muted-foreground">{request.time ? formatRelative(request.time) : "—"}</Td>
                <Td>{listNames[request.listId] ?? "—"}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    {!joined && (
                      <Button
                        size="sm"
                        onClick={() => {
                          joinPullModeRequest(request.channelSession, "PRIMARY", request.id);
                          navigate(WORKSPACE_PATH);
                        }}
                      >
                        {t("pull-mode.join")}
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void confirm({
                            title: t("snackbar.Close-Chat"),
                            description: t("snackbar.Are-you-sure-you-want-to-close-this-Chat?"),
                            destructive: true,
                          }).then((ok) => ok && endPullModeRequest(request.id))
                        }
                      >
                        {t("pull-mode.end")}
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{t("pull-mode.manage-subscriptions")}</DialogTitle>
          <DialogDescription>{t("pull-mode.select-a-list-to-subscribe")}</DialogDescription>
          {listsQuery.isPending && lists.length === 0 ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t("supervisor.loading-dashboard")}
            </p>
          ) : lists.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("globals.no-data-available")}</p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {lists.map((list) => (
                <li key={list.id}>
                  <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                    <Checkbox
                      checked={subscribedIds.has(list.id)}
                      onCheckedChange={(on) => setPullModeSubscription(list, on === true)}
                    />
                    {list.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </DataView>
  );
}
