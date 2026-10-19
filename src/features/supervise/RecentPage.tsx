import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DataTable, DataView, EmptyRow, Td, Th } from "@/components/common/DataView";
import { Pager } from "@/components/common/ListChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { conversationManagerApi, unifiedAdminApi } from "@/core/api";
import { searchConversationsQuery } from "@/core/api/graphql";
import { formatDateTime, formatDuration } from "@/core/i18n";
import { useCurrentUser, usePermission } from "@/core/auth";
import { HistoryDialog, useMaskedValue } from "@/features/workspace";
import { unwrapList } from "@/shared/lib/unwrap";
interface ConversationDoc {
  id: string;
  state?: string;
  conversationDirection?: string;
  creationTime?: string | number;
  endTime?: string | number;
  durationInSeconds?: number;
  customer?: { _id?: string; firstName?: string; phoneNumber?: string };
}
const PAGE = 25;
function CustomerName({ row }: { row: ConversationDoc }) {
  const first = useMaskedValue(row.customer?.firstName, "firstName", "manage");
  const phone = useMaskedValue(row.customer?.phoneNumber, "phoneNumber", "manage");
  return <>{first || phone || "—"}</>;
}
export default function RecentPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const [page, setPage] = useState(0),
    [selected, setSelected] = useState<string | null>(null);
  const canHistory = usePermission("history");
  const [draft, setDraft] = useState({ search: "", direction: "", within: "", channels: [] as string[] });
  const [filters, setFilters] = useState<{ key: string; operator: string; value: string }[]>([]);
  const [appliedChannels, setAppliedChannels] = useState<string[]>([]);
  const [sort, setSort] = useState<{
    sortBy: "creationTime" | "durationInSeconds";
    sortOrder: "ASC" | "DESC";
  }>({ sortBy: "creationTime", sortOrder: "DESC" });
  const channels = useQuery({
    queryKey: ["configured-channels"],
    queryFn: async () => unwrapList<{ id?: string; name: string }>(await unifiedAdminApi.get("/channels")),
  });
  const query = useQuery({
    queryKey: ["recent-conversations", user?.id, page, filters, appliedChannels, sort],
    enabled: Boolean(user),
    queryFn: async ({ signal }) => {
      const scoped = [{ key: "agentParticipants.id", operator: "equal_to", value: user!.id }, ...filters];
      const body = await conversationManagerApi.post<{
        errors?: { message: string }[];
        data?: { searchConversations?: { docs?: ConversationDoc[]; totalDocs?: number } };
      }>(
        "/graphql",
        {
          query: searchConversationsQuery(PAGE, page * PAGE, {
            ...sort,
            filters: scoped,
            channels: appliedChannels,
          }),
        },
        { signal },
      );
      if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join(" · "));
      const node = body.data?.searchConversations;
      return { docs: node?.docs ?? [], total: node?.totalDocs ?? 0 };
    },
  });
  const apply = () => {
    const next = [] as typeof filters;
    if (draft.search.trim())
      next.push({ key: "customer.firstName", operator: "contains", value: draft.search.trim() });
    if (draft.direction)
      next.push({ key: "conversationDirection", operator: "equal_to", value: draft.direction });
    if (draft.within)
      next.push({
        key: "endTime",
        operator: "greater_than_equal_to",
        value: new Date(Date.now() - Number(draft.within) * 3600_000).toISOString(),
      });
    // Channel selections are alternatives, represented with the source's nested OR expression below.
    setFilters(next);
    setAppliedChannels([...draft.channels]);
    setPage(0);
  };
  const rows = query.data?.docs ?? [],
    total = query.data?.total ?? 0;
  const sortBy = (field: typeof sort.sortBy) => {
    setSort({
      sortBy: field,
      sortOrder: sort.sortBy === field && sort.sortOrder === "DESC" ? "ASC" : "DESC",
    });
    setPage(0);
  };
  return (
    <DataView
      title={t("supervisor.recent-conversations-detail")}
      toolbar={
        <form
          className="flex w-full flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <Input
            aria-label="Search customer name"
            placeholder="Search customer name"
            className="w-56"
            value={draft.search}
            onChange={(event) => setDraft({ ...draft, search: event.target.value })}
          />
          <select
            aria-label="Conversation direction"
            className="h-9 rounded-md border bg-surface px-2 text-sm"
            value={draft.direction}
            onChange={(event) => setDraft({ ...draft, direction: event.target.value })}
          >
            <option value="">All directions</option>
            <option>INBOUND</option>
            <option>OUTBOUND</option>
          </select>
          <select
            aria-label="Conversation time range"
            className="h-9 rounded-md border bg-surface px-2 text-sm"
            value={draft.within}
            onChange={(event) => setDraft({ ...draft, within: event.target.value })}
          >
            <option value="">All time</option>
            <option value="24">Last 24 hours</option>
            <option value="72">Last 3 days</option>
            <option value="168">Last 7 days</option>
          </select>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline">
                {draft.channels.length ? `${draft.channels.length} channels` : "All channels"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-72 overflow-auto">
              <div className="grid gap-2">
                {channels.isError && (
                  <p role="alert" className="text-xs text-destructive-text">
                    {channels.error.message}
                  </p>
                )}
                {(channels.data ?? []).map((channel) => (
                  <label key={channel.id ?? channel.name} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.channels.includes(channel.name)}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          channels: event.target.checked
                            ? [...draft.channels, channel.name]
                            : draft.channels.filter((name) => name !== channel.name),
                        })
                      }
                    />
                    {channel.name}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button type="submit">Search</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft({ search: "", direction: "", within: "", channels: [] });
              setFilters([]);
              setAppliedChannels([]);
              setPage(0);
            }}
          >
            Reset
          </Button>
        </form>
      }
      footer={<Pager page={page} pageSize={PAGE} total={total} onPage={setPage} />}
    >
      {query.isError && (
        <p role="alert" className="p-4 text-destructive-text">
          {query.error.message}
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      <DataTable>
        <thead>
          <tr>
            <Th>{t("supervisor.customer")}</Th>
            <Th>{t("globals.direction")}</Th>
            <Th>{t("supervisor.state")}</Th>
            <Th>
              <button onClick={() => sortBy("creationTime")}>
                {t("supervisor.time")}{" "}
                {sort.sortBy === "creationTime" ? (sort.sortOrder === "ASC" ? "↑" : "↓") : ""}
              </button>
            </Th>
            <Th>
              <button onClick={() => sortBy("durationInSeconds")}>
                {t("recordings.duration")}{" "}
                {sort.sortBy === "durationInSeconds" ? (sort.sortOrder === "ASC" ? "↑" : "↓") : ""}
              </button>
            </Th>
            {canHistory && <Th>History</Th>}
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <EmptyRow>
              {query.isPending ? t("supervisor.loading-dashboard") : t("globals.no-data-available")}
            </EmptyRow>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              <Td className="font-medium">
                <CustomerName row={row} />
              </Td>
              <Td>{row.conversationDirection}</Td>
              <Td>{row.state && <Badge variant="secondary">{row.state}</Badge>}</Td>
              <Td>{row.creationTime ? formatDateTime(row.creationTime) : "—"}</Td>
              <Td>{formatDuration(row.durationInSeconds ?? 0)}</Td>
              {canHistory && (
                <Td>
                  <Button size="sm" variant="outline" onClick={() => setSelected(row.id)}>
                    View history
                  </Button>
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </DataTable>
      {selected && <HistoryDialog conversationId={selected} onClose={() => setSelected(null)} />}
    </DataView>
  );
}
