import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getConfig } from "@/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { confirm } from "@/components/common/confirm";
import { useCurrentUser, type Team } from "@/core/auth";
import { socketManager } from "@/core/realtime";
import { fetchAgentActivity, fetchMrds } from "./api";
import { ReportFrame, ReportTable, Td, Th } from "./ReportTable";
import { useQueryError } from "./useQueryError";

type ViewTeam = Team & { canEdit: boolean };

/**
 * unified-agent active-agent-details: supervisors see (and may change) agents in
 * the teams they supervise; an agent without the supervisor role sees only their
 * own team, read-only.
 */
function visibleTeams(user: ReturnType<typeof useCurrentUser>): ViewTeam[] {
  const supervisor = Boolean(user?.roles?.includes("supervisor"));
  const teams: ViewTeam[] = supervisor
    ? (user?.supervisedTeams ?? []).map((team) => ({ ...team, canEdit: true }))
    : [];
  const own = user?.userTeam;
  if (!supervisor && own?.teamId && !teams.some((team) => team.teamId === own.teamId))
    teams.push({ ...own, canEdit: false });
  return teams;
}

const FORCED_LOGOUT = {
  name: "FORCED_LOGOUT_BY_SUPERVISOR",
  description: "Logout by supervisor",
  type: "LOGOUT",
  code: 9,
  id: "62ffc95cf12b6ccf1594d934",
};

function changeState(agentId: string, name: "READY" | "LOGOUT") {
  socketManager.emit("changeAgentState", {
    agentId,
    action: "agentState",
    state:
      name === "READY"
        ? { name: "READY", reasonCode: null }
        : { name: "LOGOUT", flag: "dashboard", reasonCode: FORCED_LOGOUT },
  });
}

export default function AgentsPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const teams = useMemo(() => visibleTeams(user), [user]);
  const [teamId, setTeamId] = useState(teams.length > 1 ? "all" : (teams[0]?.teamId ?? ""));
  const [search, setSearch] = useState("");
  const supervisorName = user?.roles?.includes("supervisor") ? (user.username ?? "") : "";
  const list = useMemo(() => {
    if (teamId === "all") return teams.map((team) => ({ teamId: team.teamId, supervisorName: "" }));
    return teamId ? [{ teamId, supervisorName }] : [];
  }, [teamId, teams, supervisorName]);

  const agentsQuery = useQuery({
    queryKey: ["supervise", "agents", list],
    queryFn: () => fetchAgentActivity(list),
    enabled: list.length > 0,
    refetchInterval: getConfig().DASHBOARD_REFRESH_TIME,
  });
  const mrdsQuery = useQuery({ queryKey: ["supervise", "mrds"], queryFn: fetchMrds, staleTime: 60_000 });
  useQueryError(agentsQuery.isError, t("snackbar.Error-Getting-Active-Agent-Details"));
  useQueryError(mrdsQuery.isError, t("snackbar.Error-Getting-MRDs-List"));

  const mrds = mrdsQuery.data ?? [];
  const canEdit =
    teamId === "all"
      ? teams.some((team) => team.canEdit)
      : Boolean(teams.find((team) => team.teamId === teamId)?.canEdit);
  const agents = (agentsQuery.data?.agents ?? []).filter((agent) =>
    agent.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <ReportFrame
      toolbar={
        <>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("supervisor.search-agent")}
            className="w-48"
          />
          {teams.length > 0 && (
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("supervisor.select-team")} />
              </SelectTrigger>
              <SelectContent>
                {teams.length > 1 && <SelectItem value="all">{t("supervisor.all-teams")}</SelectItem>}
                {teams.map((team) => (
                  <SelectItem key={team.teamId} value={team.teamId}>
                    {team.teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </>
      }
    >
      <ReportTable>
        <thead>
          <tr>
            <Th>{t("supervisor.agent(s)")}</Th>
            <Th>{t("supervisor.state")}</Th>
            <Th>{t("supervisor.active-conversation")}</Th>
            {mrds.map((mrd) => (
              <Th key={mrd.id}>{mrd.name}</Th>
            ))}
            <Th />
          </tr>
        </thead>
        <tbody>
          {agents.length === 0 && (
            <tr>
              <Td className="text-muted-foreground">
                {agentsQuery.isLoading ? t("supervisor.loading-dashboard") : t("globals.no-data-available")}
              </Td>
            </tr>
          )}
          {agents.map((agent) => (
            <tr key={agent.id}>
              <Td>{agent.name}</Td>
              <Td>{agent.state}</Td>
              <Td>{agent.activeChatsCount ?? 0}</Td>
              {mrds.map((mrd) => (
                <Td key={mrd.id}>{agent.mrds?.find((item) => item.id === mrd.id)?.state}</Td>
              ))}
              <Td>
                {canEdit && (
                  <div className="flex gap-1">
                    {agent.state?.toUpperCase() !== "READY" && (
                      <Button size="sm" variant="outline" onClick={() => changeState(agent.id, "READY")}>
                        {t("supervisor.ready")}
                      </Button>
                    )}
                    {/* As before: a ready agent holding a reserved channel cannot be logged out from here. */}
                    {!(
                      agent.state?.toUpperCase() === "READY" &&
                      agent.mrds?.some((item) => String(item.state).toUpperCase() === "RESERVED")
                    ) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void confirm({
                            title: t("app-header.logout"),
                            destructive: true,
                          }).then((ok) => {
                            if (ok) changeState(agent.id, "LOGOUT");
                          });
                        }}
                      >
                        {t("app-header.logout")}
                      </Button>
                    )}
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </ReportFrame>
  );
}
