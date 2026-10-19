import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getConfig } from "@/config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser, type Team } from "@/core/auth";
import { formatDuration } from "@/core/i18n";
import { fetchQueuedChats } from "./api";
import { asArray, chatsFromBuckets, sortBySeconds, type ChatBucket } from "./model";
import { ReportFrame, ReportTable, Td, Th } from "./ReportTable";
import { useQueryError } from "./useQueryError";

const NO_TEAMS: Team[] = [];

export default function QueuesPage() {
  const { t } = useTranslation();
  const teams = useCurrentUser()?.supervisedTeams ?? NO_TEAMS;
  const [teamId, setTeamId] = useState(teams[0]?.teamId ?? "");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const query = useQuery({
    queryKey: ["supervise", "queued", teamId],
    queryFn: () => fetchQueuedChats(teamId),
    enabled: Boolean(teamId),
    refetchInterval: getConfig().DASHBOARD_REFRESH_TIME,
  });
  useQueryError(query.isError, t("snackbar.Error-Getting-Active-Chats-with-Agents"));

  const rows = useMemo(
    () => sortBySeconds(chatsFromBuckets(asArray<ChatBucket>(query.data)), "waitingSince", order),
    [query.data, order],
  );

  return (
    <ReportFrame
      toolbar={
        teams.length > 0 && (
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("supervisor.select-team")} />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.teamId} value={team.teamId}>
                  {team.teamName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
    >
      <ReportTable>
        <thead>
          <tr>
            <Th>{t("supervisor.customer")}</Th>
            <Th>
              <button type="button" onClick={() => setOrder((value) => (value === "asc" ? "desc" : "asc"))}>
                {t("supervisor.waiting-since")}
              </button>
            </Th>
            <Th>{t("supervisor.queue")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <Td className="text-muted-foreground">
                {query.isLoading ? t("supervisor.loading-dashboard") : t("globals.no-data-available")}
              </Td>
            </tr>
          )}
          {rows.map((chat, index) => (
            <tr key={chat.conversationId ?? index}>
              <Td>
                <div>{chat.customerName}</div>
                {chat.channelIdentity && (
                  <div className="text-xs text-muted-foreground">{chat.channelIdentity}</div>
                )}
              </Td>
              <Td>{formatDuration(chat.waitingSince ?? 0)}</Td>
              <Td>{chat.queueName}</Td>
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </ReportFrame>
  );
}
