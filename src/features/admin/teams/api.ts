import { unifiedAdminApi } from "@/core/api";
import {
  memberFromDoc,
  teamWriteBody,
  type Team,
  type TeamMember,
  type TeamMemberType,
  type TeamUser,
} from "./model";

const opts = { legacyTenantHeaders: true } as const;

function rows<T>(body: T[] | { docs?: T[] } | null | undefined): T[] {
  if (Array.isArray(body)) return body;
  return body?.docs ?? [];
}

export async function listTeams(ids?: string): Promise<Team[]> {
  const body = await unifiedAdminApi.get<Team[] | { docs?: Team[] }>("/team", {
    ...opts,
    searchParams: ids ? { ids } : undefined,
  });
  return rows(body).filter((team) => !team.isDeleted);
}

export async function listDirectoryUsers(type: "agent" | "supervisor", username = ""): Promise<TeamUser[]> {
  const body = await unifiedAdminApi.get<TeamUser[] | { docs?: TeamUser[] }>(`/users/${type}`, {
    ...opts,
    searchParams: { username, offset: 1, limit: 200 },
  });
  return rows(body);
}

export async function listTeamMembers(teamId: string, type: TeamMemberType): Promise<TeamMember[]> {
  const body = await unifiedAdminApi.get<{ docs?: { user?: TeamUser | null }[] }>(
    `/team/${encodeURIComponent(teamId)}/member`,
    { ...opts, searchParams: { type, offset: 1, limit: 200 } },
  );
  return (body?.docs ?? []).flatMap((doc) => {
    const member = memberFromDoc(doc);
    return member ? [member] : [];
  });
}

export function createTeam(input: {
  name: string;
  description: string;
  supervisorId: string;
  createdBy: string;
}): Promise<Team> {
  return unifiedAdminApi.post<Team>("/team", teamWriteBody(input), opts);
}

export function updateTeam(
  teamId: string,
  input: { name: string; description: string; supervisorId: string },
): Promise<Team> {
  return unifiedAdminApi.put<Team>(`/team/${encodeURIComponent(teamId)}`, teamWriteBody(input), opts);
}

export function deleteTeam(teamId: string): Promise<unknown> {
  return unifiedAdminApi.delete(`/team/${encodeURIComponent(teamId)}`, opts);
}

export async function addTeamMembers(
  teamId: string,
  type: TeamMemberType,
  usernames: string[],
): Promise<void> {
  if (usernames.length === 0) return;
  await unifiedAdminApi.post(`/team/${encodeURIComponent(teamId)}/member`, { type, usernames }, opts);
}

export async function removeTeamMembers(
  teamId: string,
  type: TeamMemberType,
  usernames: string[],
): Promise<void> {
  if (usernames.length === 0) return;
  await unifiedAdminApi.delete(`/team/${encodeURIComponent(teamId)}/member`, {
    ...opts,
    searchParams: { type, usernames: usernames.join(",") },
  });
}
