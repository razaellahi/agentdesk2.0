import { Bell } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { announcementApi } from "@/core/api";
import { useCurrentUser } from "@/core/auth";
import { formatDateTime } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import { unwrapList } from "@/shared/lib/unwrap";

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

/** Agent-facing team announcements with seen status (UA agent-announcements). */
export function AgentAnnouncementsMenu() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const client = useQueryClient();
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
    refetchInterval: 60_000,
    queryFn: async () => {
      const body = await announcementApi.get(`/announcement/`, {
        searchParams: { teamIds: teamIds.join(","), status: "active" },
      });
      return unwrapList<Announcement>(body).filter((row) => row.supervisorId !== user?.id);
    },
  });

  const markSeen = useMutation({
    mutationFn: (announcementId: string) =>
      announcementApi.put(`/announcement/seenStatus/${announcementId}`, { userId: user!.id }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["agent-announcements"] });
    },
  });

  const rows = (query.data ?? []).slice().sort((a, b) => {
    const left = new Date(b.scheduledTime ?? 0).getTime();
    const right = new Date(a.scheduledTime ?? 0).getTime();
    return left - right;
  });
  const unread = rows.filter((row) => {
    const id = row.id ?? row._id;
    if (!id || !user?.id) return false;
    return !(row.seenBy ?? []).includes(user.id);
  }).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="relative size-9 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          aria-label={t("announcements.announcements")}
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span
              className="absolute end-2.5 top-2 size-2 rounded-full bg-destructive ring-2 ring-surface"
              aria-hidden
            />
          )}
        </Button>
      </PopoverTrigger>
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
          {teamIds.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">
              {t("app-header.no-announcement-available")}
            </p>
          )}
          {teamIds.length > 0 && query.isLoading && (
            <p className="p-4 text-center text-xs text-muted-foreground">{t("globals.loading")}</p>
          )}
          {teamIds.length > 0 && !query.isLoading && rows.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">
              {t("app-header.no-announcement-available")}
            </p>
          )}
          <ul>
            {rows.map((row) => {
              const id = row.id ?? row._id ?? "";
              const seen = Boolean(user?.id && (row.seenBy ?? []).includes(user.id));
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full border-b px-3 py-2.5 text-start transition-colors hover:bg-muted/60",
                      !seen && "bg-primary-soft/40",
                    )}
                    onClick={() => {
                      if (!seen && id) markSeen.mutate(id);
                    }}
                  >
                    <p className="text-sm font-medium whitespace-pre-wrap">{row.announcementText}</p>
                    {row.scheduledTime && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDateTime(row.scheduledTime)}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
