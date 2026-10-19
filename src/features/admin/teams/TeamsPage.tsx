import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm";
import { DataTable, DataView, Td, Th } from "@/components/common/DataView";
import { EmptyState, Pager, SearchField } from "@/components/common/ListChrome";
import { QueryError } from "@/components/common/QueryError";
import { ReadOnlyNotice } from "@/components/common/ReadOnlyNotice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser, usePermission } from "@/core/auth";
import { formatDateTime } from "@/core/i18n";
import { deleteTeam, listTeamMembers, listTeams } from "./api";
import { canDeleteTeam, filterTeams, supervisorPickerLocked, type Team } from "./model";
import { TeamEditor } from "./TeamEditor";

const PAGE_SIZE = 10;

export default function TeamsPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const canManage = usePermission("teamsManage");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<Team | "new" | null>(null);
  const [agentsFor, setAgentsFor] = useState<Team | null>(null);

  const roles = user?.roles ?? [];
  const isAdmin = roles.includes("admin");
  const lockSupervisor = supervisorPickerLocked(roles);
  const supervisedIds =
    !isAdmin && user?.roles.includes("supervisor")
      ? (user.supervisedTeams ?? []).map((team) => team.teamId).join(",")
      : undefined;
  const teams = useQuery({
    queryKey: ["teams", supervisedIds ?? "all"],
    queryFn: () => (supervisedIds === "" ? Promise.resolve([]) : listTeams(supervisedIds)),
  });

  const filtered = useMemo(() => filterTeams(teams.data ?? [], search), [teams.data, search]);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const summaries = useQueries({
    queries: visible.map((team) => ({
      queryKey: ["teams", team.team_Id, "summary"],
      queryFn: async () => {
        const [agents, secondary] = await Promise.all([
          listTeamMembers(team.team_Id, "agent"),
          listTeamMembers(team.team_Id, "secondary-supervisor"),
        ]);
        return { agents, secondary };
      },
    })),
  });

  const remove = useMutation({
    mutationFn: deleteTeam,
    onSuccess: async () => {
      toast.success(t("teams.deleted"));
      await queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (cause: Error) => toast.error(cause.message),
  });

  const agentList = useQuery({
    queryKey: ["teams", agentsFor?.team_Id, "agent"],
    queryFn: () => listTeamMembers(agentsFor!.team_Id, "agent"),
    enabled: Boolean(agentsFor),
  });

  return (
    <DataView
      description={t("teams.description-page")}
      banner={!canManage ? <ReadOnlyNotice /> : undefined}
      toolbar={
        <>
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(0);
            }}
            placeholder={t("teams.search")}
            className="w-64"
          />
          {canManage && (
            <Button className="ms-auto" onClick={() => setEditor("new")}>
              <Plus />
              {t("teams.new")}
            </Button>
          )}
        </>
      }
      footer={<Pager page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />}
    >
      <QueryError error={teams.error} onRetry={() => void teams.refetch()} />
      {teams.isPending && <p className="p-4 text-sm text-muted-foreground">{t("teams.loading")}</p>}
      {!teams.isPending && filtered.length === 0 && (
        <EmptyState icon={Users} title={t("teams.empty")} description={t("teams.empty-hint")} />
      )}
      {filtered.length > 0 && (
        <DataTable>
          <thead>
            <tr>
              <Th>{t("teams.name")}</Th>
              <Th>{t("teams.description")}</Th>
              <Th>{t("teams.supervisor")}</Th>
              <Th>{t("teams.secondary")}</Th>
              <Th>{t("teams.agents")}</Th>
              <Th>{t("teams.created-on")}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {visible.map((team, index) => {
              const summary = summaries[index]?.data;
              const agentCount = summary?.agents.length;
              const allowDelete =
                canManage &&
                canDeleteTeam({
                  roles,
                  username: user?.username,
                  createdBy: team.created_by,
                });
              return (
                <tr key={team.team_Id}>
                  <Td className="font-medium">{team.team_name}</Td>
                  <Td className="max-w-56 truncate">{team.description || t("teams.none")}</Td>
                  <Td>{team.supervisor?.username || t("teams.none")}</Td>
                  <Td className="max-w-48 truncate">
                    {summary?.secondary.map((member) => member.username).join(", ") || t("teams.none")}
                  </Td>
                  <Td>
                    {summary == null ? (
                      "…"
                    ) : agentCount && agentCount > 0 ? (
                      <button
                        type="button"
                        className="text-primary underline-offset-2 hover:underline"
                        onClick={() => setAgentsFor(team)}
                      >
                        {agentCount}
                      </button>
                    ) : (
                      0
                    )}
                  </Td>
                  <Td>{team.createdAt ? formatDateTime(team.createdAt) : t("teams.none")}</Td>
                  <Td className="text-end">
                    {canManage && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("teams.edit")}
                        onClick={() => setEditor(team)}
                      >
                        <Pencil />
                      </Button>
                    )}
                    {allowDelete && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("teams.delete")}
                        onClick={() => {
                          void confirm({
                            title: t("teams.delete-title", { name: team.team_name }),
                            description: t("teams.delete-body"),
                            confirmLabel: t("teams.delete"),
                            destructive: true,
                          }).then((ok) => {
                            if (ok) remove.mutate(team.team_Id);
                          });
                        }}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}
      {editor && (
        <TeamEditor
          team={editor === "new" ? null : editor}
          teams={teams.data ?? []}
          createdBy={user?.username ?? ""}
          lockSupervisor={lockSupervisor}
          self={
            user
              ? { id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName }
              : undefined
          }
          onClose={() => setEditor(null)}
        />
      )}
      <Dialog open={Boolean(agentsFor)} onOpenChange={(open) => !open && setAgentsFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("teams.agents-title", { name: agentsFor?.team_name ?? "" })}</DialogTitle>
          </DialogHeader>
          {agentList.isPending && <p className="text-sm text-muted-foreground">{t("teams.loading")}</p>}
          <ul className="space-y-1 text-sm">
            {(agentList.data ?? []).map((member) => (
              <li key={member.username}>
                {member.username}
                <span className="text-muted-foreground"> ({member.name})</span>
              </li>
            ))}
            {agentList.data?.length === 0 && (
              <li className="text-muted-foreground">{t("teams.no-agents")}</li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </DataView>
  );
}
