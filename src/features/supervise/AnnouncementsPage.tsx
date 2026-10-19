import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm";
import { QueryError } from "@/components/common/QueryError";
import { DataTable, DataView, EmptyRow, Td, Th } from "@/components/common/DataView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { announcementApi } from "@/core/api";
import { useCurrentUser } from "@/core/auth";
import { formatDateTime } from "@/core/i18n";
import { unwrapList } from "@/shared/lib/unwrap";

interface Announcement {
  _id?: string;
  id?: string;
  announcementText?: string;
  status?: string;
  expiryTime?: string;
  scheduledTime?: string;
  teams?: { teamName?: string }[];
}

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");
  const [until, setUntil] = useState("");
  const query = useQuery({
    queryKey: ["announcements", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () =>
      unwrapList<Announcement>(
        await announcementApi.get(`/announcement?page=1&limit=1000&supervisorIds=${user?.id ?? ""}`),
      ),
  });

  const create = useMutation({
    mutationFn: () =>
      announcementApi.post("/announcement", {
        teams: (user?.supervisedTeams ?? []).map((team) => ({
          teamId: team.teamId,
          teamName: team.teamName,
        })),
        announcementText: text,
        scheduledTime: new Date(when).toISOString(),
        expiryTime: new Date(until).toISOString(),
        supervisorId: user?.id,
        supervisorName: user?.username,
      }),
    onSuccess: async () => {
      toast.success(t("snackbar.New-Announcement"));
      setText("");
      await queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => announcementApi.delete(`/announcement/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const rows = (query.data ?? []).filter((row) => !status || row.status?.toLowerCase() === status);

  return (
    <DataView
      toolbar={
        <>
          {(
            [
              ["", "announcements.all-announcements"],
              ["active", "announcements.active-announcements"],
              ["scheduled", "announcements.scheduled-announcements"],
              ["expired", "announcements.expired-announcements"],
            ] as const
          ).map(([value, key]) => (
            <Button
              key={value || "all"}
              size="sm"
              variant={status === value ? "default" : "outline"}
              onClick={() => setStatus(value)}
            >
              {t(key)}
            </Button>
          ))}
        </>
      }
    >
      <form
        className="grid gap-2 border-b p-4 md:grid-cols-[1fr_auto_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim() && when && until) create.mutate();
        }}
      >
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("announcements.announcement")}
          className="min-h-10 md:col-span-1"
        />
        <Input
          type="datetime-local"
          value={when}
          onChange={(event) => setWhen(event.target.value)}
          aria-label={t("supervisor.date-time")}
        />
        <Input
          type="datetime-local"
          value={until}
          onChange={(event) => setUntil(event.target.value)}
          aria-label={t("announcements.expiry")}
        />
        <Button type="submit" disabled={create.isPending || !text.trim()}>
          {t("announcements.new-announcement")}
        </Button>
      </form>
      <QueryError error={query.error} onRetry={() => void query.refetch()} />
      <DataTable>
        <thead>
          <tr>
            <Th>{t("announcements.announcement")}</Th>
            <Th>{t("announcements.teams")}</Th>
            <Th>{t("announcements.status")}</Th>
            <Th>{t("announcements.expiry")}</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <EmptyRow>
              {query.isLoading ? t("supervisor.loading-dashboard") : t("announcements.no-more-annoucements")}
            </EmptyRow>
          )}
          {rows.map((row) => {
            const id = row._id || row.id || "";
            return (
              <tr key={id}>
                <Td className="max-w-md font-medium">{row.announcementText}</Td>
                <Td>
                  {row.teams
                    ?.map((team) => team.teamName)
                    .filter(Boolean)
                    .join(", ")}
                </Td>
                <Td>{row.status && <Badge variant="secondary">{row.status}</Badge>}</Td>
                <Td>{row.expiryTime ? formatDateTime(row.expiryTime) : ""}</Td>
                <Td>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void confirm({
                        title: t("announcements.delete-announcement"),
                        description: t("announcements.sure-delete-announcement"),
                        destructive: true,
                      }).then((ok) => {
                        if (ok && id) remove.mutate(id);
                      });
                    }}
                  >
                    {t("announcements.delete")}
                  </Button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </DataView>
  );
}
