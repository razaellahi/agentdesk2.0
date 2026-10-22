import { Bell, ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { IconTooltip } from "@/components/common/IconTooltip";
import { UnreadBadge } from "@/components/common/UnreadBadge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getConfig } from "@/config";
import { announcementApi, qmApi } from "@/core/api";
import { useCurrentUser } from "@/core/auth";
import { formatDateTime } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import { unwrapList } from "@/shared/lib/unwrap";
import { loadConversationActivities } from "../api/history";
import { useSessionEvent } from "../hooks/useSessionEvent";
import { startConversationFromCustomer } from "../linking/startConversation";
import { lower } from "../model/systemMessages";
import { WORKSPACE_PATH } from "./AgentSessionProvider";

interface Announcement {
  id?: string;
  _id?: string;
  announcementText?: string;
  scheduledTime?: string;
  expiryTime?: string;
  status?: string;
  seenBy?: string[];
  supervisorId?: string;
  createdBy?: string;
}

/** A quality-management notice, e.g. a conversation of the agent's was evaluated. */
interface QmNotification {
  id?: string;
  _id?: string;
  message?: string;
  created_at?: string;
  is_read?: boolean;
  type?: string;
  metadata?: { conversationId?: string };
}

interface QmPage {
  docs?: QmNotification[];
  page?: number;
  totalPages?: number;
}

interface Row {
  id: string;
  text: string;
  time?: string;
  seen: boolean;
  qm: boolean;
  conversationId?: string;
}

const QM_PAGE_SIZE = 10;

/** Team announcements and QM notifications, newest first, with seen status (UA agent-announcements). */
export function AgentAnnouncementsMenu() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const teamIds = useMemo(() => {
    const ids = [
      ...(user?.supervisedTeams?.map((team) => team.teamId) ?? []),
      ...(user?.userTeam?.teamId ? [user.userTeam.teamId] : []),
    ];
    return [...new Set(ids.filter(Boolean))];
  }, [user]);

  const query = useQuery({
    queryKey: ["agent-announcements", teamIds.join(",")],
    enabled: teamIds.length > 0,
    // Socket events keep it current; the slow poll only covers a missed event.
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const body = await announcementApi.get(`/announcement/`, {
        searchParams: { teamIds: teamIds.join(","), status: "active" },
      });
      return unwrapList<Announcement>(body).filter((row) => row.supervisorId !== user?.id);
    },
  });

  const qm = useInfiniteQuery({
    queryKey: ["qm-notifications", user?.id],
    enabled: Boolean(user?.id && getConfig().QM_URL),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      qmApi.get<QmPage>(`/notification/${encodeURIComponent(user!.id)}`, {
        searchParams: { limit: QM_PAGE_SIZE, page: pageParam },
      }),
    getNextPageParam: (last, _pages, page) =>
      (last.docs?.length ?? 0) > 0 && (last.totalPages ?? page) > page ? page + 1 : undefined,
  });

  const refreshAnnouncements = () => void client.invalidateQueries({ queryKey: ["agent-announcements"] });
  useSessionEvent<{ supervisorId?: string }>("announcementCreated", (res) => {
    if (res?.supervisorId !== user?.id) refreshAnnouncements();
  });
  useSessionEvent("announcementDeleted", refreshAnnouncements);
  useSessionEvent("qmNotification", () => void client.invalidateQueries({ queryKey: ["qm-notifications"] }));

  const markSeen = useMutation({
    mutationFn: (announcementId: string) =>
      announcementApi.put(`/announcement/seenStatus/${announcementId}`, { userId: user!.id }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["agent-announcements"] });
    },
  });

  const markQmRead = useMutation({
    mutationFn: (id: string) => qmApi.patch(`/notification/mark-as-read/${encodeURIComponent(id)}`),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["qm-notifications"] });
    },
  });

  // The evaluated conversation opens as the customer's history (gettingConversationData).
  const openEvaluated = async (conversationId: string) => {
    try {
      const events = await loadConversationActivities(conversationId);
      const ended = events.find((event) => lower(event.name) === "channel_session_ended");
      const customer = (ended ?? events.find((event) => event.channelSession?.customer))?.channelSession
        ?.customer;
      if (!customer) return;
      startConversationFromCustomer(customer);
      setOpen(false);
      void navigate(WORKSPACE_PATH);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const rows: Row[] = [
    ...(query.data ?? []).map((row) => ({
      id: row.id ?? row._id ?? "",
      text: row.announcementText ?? "",
      time: row.scheduledTime,
      seen: Boolean(user?.id && (row.seenBy ?? []).includes(user.id)),
      qm: false,
    })),
    ...(qm.data?.pages ?? [])
      .flatMap((page) => page.docs ?? [])
      .map((row) => ({
        id: row.id ?? row._id ?? "",
        text: row.message ?? "",
        time: row.created_at,
        seen: row.is_read === true,
        qm: true,
        conversationId: row.metadata?.conversationId,
      })),
  ]
    .filter((row) => row.id)
    .sort((a, b) => new Date(b.time ?? 0).getTime() - new Date(a.time ?? 0).getTime());
  const unread = rows.filter((row) => !row.seen).length;
  const loading = (teamIds.length > 0 && query.isLoading) || qm.isLoading;

  const select = (row: Row) => {
    if (!row.qm) {
      if (!row.seen) markSeen.mutate(row.id);
      return;
    }
    if (!row.seen) markQmRead.mutate(row.id);
    if (row.conversationId) void openEvaluated(row.conversationId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <IconTooltip label={t("announcements.announcements")}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="relative size-9 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label={t("announcements.announcements")}
          >
            <Bell className="size-[18px]" />
            {unread > 0 && <UnreadBadge />}
          </Button>
        </PopoverTrigger>
      </IconTooltip>
      <PopoverContent
        align="end"
        className="w-96 rounded-2xl border border-border bg-surface p-0 shadow-lift"
      >
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-medium tracking-tight text-foreground">
            {t("app-header.team-announcements")}
          </p>
        </div>
        <ScrollArea className="max-h-80">
          {loading && <p className="p-4 text-center text-xs text-muted-foreground">{t("globals.loading")}</p>}
          {!loading && rows.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">
              {t("app-header.no-announcement-available")}
            </p>
          )}
          <ul>
            {rows.map((row) => (
              <li key={`${row.qm ? "qm" : "team"}:${row.id}`}>
                <button
                  type="button"
                  className={cn(
                    "w-full border-b px-3 py-2.5 text-start transition-colors hover:bg-muted/60",
                    !row.seen && "bg-primary-soft/40",
                  )}
                  onClick={() => select(row)}
                >
                  {row.qm && (
                    <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-surface-2 px-1.5 text-xs font-medium text-muted-foreground">
                      <ClipboardCheck className="size-3" aria-hidden />
                      {t("announcements.quality")}
                    </span>
                  )}
                  <p className="text-sm font-medium whitespace-pre-wrap">{row.text}</p>
                  {row.time && (
                    <p className="mt-1 text-[12px] text-muted-foreground">{formatDateTime(row.time)}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {qm.hasNextPage && (
            <div className="p-2 text-center">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={qm.isFetchingNextPage}
                onClick={() => void qm.fetchNextPage()}
              >
                {t("globals.view-more")}
              </Button>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
