import { Play } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DataTable, DataView, EmptyRow, Td, Th } from "@/components/common/DataView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conversationManagerApi } from "@/core/api";
import { searchActivitiesQuery } from "@/core/api/graphql";
import { useCurrentUser, usePermission } from "@/core/auth";
import { formatDateTime } from "@/core/i18n";
import { toast } from "sonner";
import { HistoryDialog, useMaskedValue, useSecureMedia } from "@/features/workspace";
import { Pager } from "@/components/common/ListChrome";
import { formatDuration } from "@/core/i18n";
import { unwrapTotal } from "@/shared/lib/unwrap";
import { cn } from "@/shared/lib/utils";
import { useUnreadVoicemailCount } from "./voicemailUnread";

interface ActivityDoc {
  id: string;
  timestamp?: string | number;
  activity?: {
    channelSession?: {
      customer?: { _id: string; firstName?: string; phoneNumber?: string };
      channelData?: { channelCustomerIdentifier?: string };
    };
    data?: { recordingUrl?: string; additionalDetails?: { status?: string }; duration?: number };
  };
}

function VoicemailCustomer({ row }: { row: ActivityDoc }) {
  const customer = row.activity?.channelSession?.customer;
  const name = useMaskedValue(customer?.firstName, "firstName", "manage");
  const number = useMaskedValue(
    row.activity?.channelSession?.channelData?.channelCustomerIdentifier,
    "voice",
    "manage",
  );
  return <>{name || number || "—"}</>;
}
function VoicemailPlayer({ row }: { row: ActivityDoc }) {
  const { src, loading, error } = useSecureMedia(row.activity?.data?.recordingUrl);
  const queryClient = useQueryClient();
  const read = useMutation({
    mutationFn: () =>
      conversationManagerApi.put(
        "/activities/voice-mailbox-status",
        {},
        { searchParams: { activityId: row.id, status: "Read" } },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["voicemail"] }),
    onError: (e: Error) => toast.error(`Voicemail played, but read status could not be saved: ${e.message}`),
  });
  if (loading) return <span role="status">Loading recording…</span>;
  if (error || !src)
    return (
      <span role="alert" className="text-destructive-text">
        Recording unavailable
      </span>
    );
  return (
    <audio
      src={src}
      controls
      // The agent pressed Play to get here, so start without a second click.
      autoPlay
      className="h-8 max-w-xs"
      onPlay={() => {
        if (
          row.activity?.data?.additionalDetails?.status?.toLowerCase() === "unread" &&
          !read.isPending &&
          !read.isSuccess
        )
          read.mutate();
      }}
    >
      <track kind="captions" />
    </audio>
  );
}

const PAGE = 25;

function receivedAt(value: string | number | undefined) {
  if (value == null || value === "") return "";
  const numeric = Number(value);
  let date: string | number = Number.isNaN(numeric) ? value : numeric;
  if (typeof date === "string" && date.includes(" ") && !date.includes("Z") && !date.includes("T")) {
    date = `${date.replace(" ", "T")}Z`;
  }
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? String(value) : formatDateTime(parsed);
}

export default function VoicemailPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const canHistory = usePermission("history");
  const [historyCustomer, setHistoryCustomer] = useState<{ _id: string; firstName?: string } | null>(null);
  const [sort, setSort] = useState<{
    sortBy: "timestamp" | "activity.channelSession.customer.firstName";
    sortOrder: "ASC" | "DESC";
  }>({ sortBy: "timestamp", sortOrder: "DESC" });
  const [tab, setTab] = useState<"All" | "Read" | "Unread">("All");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["voicemail", user?.id, tab, search, page, sort],
    enabled: Boolean(user?.id),
    queryFn: async ({ signal }) => {
      const filters = [
        { key: "activity.name", operator: "equal_to", value: "VOICE_MAIL_ACTIVITY" },
        {
          key: "activity.data.additionalDetails.agentInfo.agentId",
          operator: "equal_to",
          value: user?.id ?? "",
        },
      ];
      if (tab !== "All") {
        filters.push({ key: "activity.data.additionalDetails.status", operator: "equal_to", value: tab });
      }
      if (search) {
        filters.push({
          key: "activity.channelSession.customer.firstName",
          operator: "contains",
          value: search,
        });
      }
      const body = await conversationManagerApi.post<{
        errors?: { message: string }[];
        data?: { searchActivities?: { docs?: ActivityDoc[]; totalDocs?: number } };
      }>("/graphql", { query: searchActivitiesQuery(filters, PAGE, page * PAGE, sort) }, { signal });
      if (body.errors?.length) throw new Error(body.errors.map((error) => error.message).join(" · "));
      const node = body.data?.searchActivities;
      return { docs: node?.docs ?? [], total: unwrapTotal(node, node?.docs?.length ?? 0) };
    },
  });

  const unread = useUnreadVoicemailCount();
  const sortBy = (field: typeof sort.sortBy) => {
    setSort({
      sortBy: field,
      sortOrder: sort.sortBy === field && sort.sortOrder === "DESC" ? "ASC" : "DESC",
    });
    setPage(0);
  };
  const rows = query.data?.docs ?? [];
  const total = query.data?.total ?? 0;

  return (
    <DataView
      title={t("voicemail.title")}
      toolbar={
        <>
          {(["All", "Read", "Unread"] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={tab === value ? "default" : "outline"}
              onClick={() => {
                setTab(value);
                setPage(0);
              }}
            >
              {t(
                value === "All"
                  ? "voicemail.tab-all"
                  : value === "Read"
                    ? "voicemail.tab-read"
                    : "voicemail.tab-unread",
              )}
              {value === "Unread" && Boolean(unread.data) && (
                <span className="rounded-full bg-destructive px-1.5 text-[11px] leading-5 font-bold text-white tabular">
                  {unread.data}
                </span>
              )}
            </Button>
          ))}
          <form
            className="ms-auto flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(0);
              setSearch(draft.trim());
            }}
          >
            <Input
              aria-label="Search voicemail customer"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("voicemail.search-placeholder")}
              className="w-56"
            />
          </form>
        </>
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
            <Th>
              <button onClick={() => sortBy("activity.channelSession.customer.firstName")}>
                {t("voicemail.col-customer")}
              </button>
            </Th>
            <Th>
              <button onClick={() => sortBy("timestamp")}>
                {t("voicemail.col-received")}{" "}
                {sort.sortBy === "timestamp" ? (sort.sortOrder === "ASC" ? "↑" : "↓") : ""}
              </button>
            </Th>
            <Th>{t("recordings.duration")}</Th>
            <Th>{t("pull-mode.status")}</Th>
            <Th>{t("voicemail.col-recording")}</Th>
            {canHistory && <Th>History</Th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <EmptyRow>
              {query.isLoading ? t("supervisor.loading-dashboard") : t("voicemail.empty-title")}
            </EmptyRow>
          )}
          {rows.map((row) => {
            const status = row.activity?.data?.additionalDetails?.status || "read";
            const isUnread = status.toLowerCase() === "unread";
            const url = row.activity?.data?.recordingUrl;
            return (
              <tr key={row.id} className={cn(isUnread && "font-semibold")}>
                <Td>
                  <VoicemailCustomer row={row} />
                </Td>
                <Td>{receivedAt(row.timestamp)}</Td>
                <Td>{formatDuration(row.activity?.data?.duration ?? 0)}</Td>
                <Td>
                  <Badge variant={isUnread ? "default" : "secondary"}>{status}</Badge>
                </Td>
                <Td>
                  {url && playing === row.id ? (
                    <VoicemailPlayer row={row} />
                  ) : (
                    url && (
                      <Button size="sm" variant="outline" onClick={() => setPlaying(row.id)}>
                        <Play className="size-3.5" aria-hidden />
                        {t("recordings.play")}
                      </Button>
                    )
                  )}
                </Td>
                {canHistory && (
                  <Td>
                    {row.activity?.channelSession?.customer?._id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryCustomer(row.activity!.channelSession!.customer!)}
                      >
                        View history
                      </Button>
                    )}
                  </Td>
                )}
              </tr>
            );
          })}
        </tbody>
      </DataTable>
      {historyCustomer && (
        <HistoryDialog customer={historyCustomer} onClose={() => setHistoryCustomer(null)} />
      )}
    </DataView>
  );
}
