import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addTeamMembers,
  createTeam,
  listDirectoryUsers,
  listTeamMembers,
  removeTeamMembers,
  updateTeam,
} from "./api";
import {
  displayName,
  memberDiff,
  mergeDirectory,
  validateTeam,
  type Team,
  type TeamFieldError,
  type TeamUser,
} from "./model";
import { UserPicker } from "./UserPicker";

export function TeamEditor({
  team,
  teams,
  createdBy,
  lockSupervisor = false,
  self,
  onClose,
}: {
  team: Team | null;
  teams: Team[];
  createdBy: string;
  /** Supervisors stay the primary supervisor; they cannot assign someone else. */
  lockSupervisor?: boolean;
  self?: TeamUser;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState(team?.team_name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [supervisorId, setSupervisorId] = useState(
    team?.supervisor_Id || (lockSupervisor ? (self?.id ?? "") : ""),
  );
  const [agents, setAgents] = useState<string[] | null>(null);
  const [secondary, setSecondary] = useState<string[] | null>(null);
  const [error, setError] = useState<TeamFieldError | null>(null);

  const supervisors = useQuery({
    queryKey: ["teams", "directory", "supervisor"],
    queryFn: () => listDirectoryUsers("supervisor"),
  });
  const directoryAgents = useQuery({
    queryKey: ["teams", "directory", "agent"],
    queryFn: () => listDirectoryUsers("agent"),
  });
  const currentAgents = useQuery({
    queryKey: ["teams", team?.team_Id, "agent"],
    queryFn: () => listTeamMembers(team!.team_Id, "agent"),
    enabled: Boolean(team),
  });
  const currentSecondary = useQuery({
    queryKey: ["teams", team?.team_Id, "secondary-supervisor"],
    queryFn: () => listTeamMembers(team!.team_Id, "secondary-supervisor"),
    enabled: Boolean(team),
  });

  const selectedAgents = agents ?? currentAgents.data?.map((member) => member.username) ?? [];
  const selectedSecondary = secondary ?? currentSecondary.data?.map((member) => member.username) ?? [];
  const supervisorOptions = useMemo(() => {
    const directory = supervisors.data ?? [];
    const extras = [self, team?.supervisor].filter((user): user is TeamUser => Boolean(user?.id));
    return mergeDirectory(
      directory,
      extras.map((user) => ({ id: user.id, username: user.username, name: displayName(user) })),
    );
  }, [supervisors.data, self, team?.supervisor]);
  const supervisor = supervisorOptions.find((user) => user.id === supervisorId);

  const agentChoices = useMemo(
    () => mergeDirectory(directoryAgents.data ?? [], currentAgents.data ?? []),
    [directoryAgents.data, currentAgents.data],
  );
  const secondaryChoices = useMemo(
    () =>
      mergeDirectory(supervisorOptions, currentSecondary.data ?? []).filter(
        (user) => user.id !== supervisorId && user.username !== supervisor?.username,
      ),
    [supervisorOptions, currentSecondary.data, supervisorId, supervisor?.username],
  );

  const save = useMutation({
    mutationFn: async () => {
      const fieldError = validateTeam({ name, description }, teams, team?.team_Id);
      setError(fieldError);
      if (fieldError) throw new Error(fieldError);
      const saved = team
        ? await updateTeam(team.team_Id, { name, description, supervisorId })
        : await createTeam({ name, description, supervisorId, createdBy });
      const teamId = saved.team_Id || team?.team_Id;
      if (!teamId) return;
      const agentChange = memberDiff(
        currentAgents.data?.map((member) => member.username) ?? [],
        selectedAgents,
      );
      const secondaryChange = memberDiff(
        currentSecondary.data?.map((member) => member.username) ?? [],
        selectedSecondary.filter((username) => username !== supervisor?.username),
      );
      await addTeamMembers(teamId, "agent", agentChange.add);
      await removeTeamMembers(teamId, "agent", agentChange.remove);
      await addTeamMembers(teamId, "secondary-supervisor", secondaryChange.add);
      await removeTeamMembers(teamId, "secondary-supervisor", secondaryChange.remove);
    },
    onSuccess: async () => {
      toast.success(t(team ? "teams.updated" : "teams.created"));
      await queryClient.invalidateQueries({ queryKey: ["teams"] });
      onClose();
    },
    onError: (cause: Error) => {
      if (
        cause.message === "name-required" ||
        cause.message === "description-long" ||
        cause.message === "name-duplicate"
      ) {
        return;
      }
      toast.error(cause.message);
    },
  });

  const loading =
    supervisors.isPending ||
    directoryAgents.isPending ||
    (Boolean(team) && (currentAgents.isPending || currentSecondary.isPending));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{team ? t("teams.edit") : t("teams.new")}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="team-name">{t("teams.name")}</Label>
            <Input id="team-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="team-description">{t("teams.description")}</Label>
            <Textarea
              id="team-description"
              value={description}
              maxLength={300}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="team-supervisor">{t("teams.supervisor")}</Label>
            <select
              id="team-supervisor"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              value={supervisorId ?? ""}
              disabled={lockSupervisor}
              onChange={(event) => {
                const next = event.target.value;
                setSupervisorId(next);
                const chosen = supervisorOptions.find((user) => user.id === next);
                if (chosen)
                  setSecondary(selectedSecondary.filter((username) => username !== chosen.username));
              }}
            >
              {!lockSupervisor && <option value="">{t("teams.no-supervisor")}</option>}
              {supervisorOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({displayName(user)})
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("teams.loading-people")}</p>
          ) : (
            <>
              <UserPicker
                legend={t("teams.secondary")}
                users={secondaryChoices}
                selected={selectedSecondary}
                disabled={save.isPending}
                onChange={setSecondary}
              />
              <UserPicker
                legend={t("teams.agents")}
                users={agentChoices}
                selected={selectedAgents}
                disabled={save.isPending}
                onChange={setAgents}
              />
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive-text">
              {t(`teams.errors.${error}`)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("labels.cancel")}
            </Button>
            <Button type="submit" disabled={save.isPending || loading}>
              {t("labels.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
