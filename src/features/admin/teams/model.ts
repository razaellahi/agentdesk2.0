/** Team records and member edits, matching unified-admin `/team`. */

export interface TeamUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

export interface Team {
  team_Id: string;
  team_name: string;
  description?: string;
  supervisor_Id?: string | null;
  supervisor?: TeamUser | null;
  source?: string;
  created_by?: string;
  createdAt?: string;
  isDeleted?: boolean;
}

export interface TeamMember {
  id: string;
  username: string;
  name: string;
}

export type TeamMemberType = "agent" | "secondary-supervisor";

export function displayName(user: {
  username: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}): string {
  const combined = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return (user.name?.trim() || combined || user.username).trim();
}

export function memberFromDoc(doc: { user?: TeamUser | null }): TeamMember | null {
  const user = doc.user;
  if (!user?.username) return null;
  return { id: user.id, username: user.username, name: displayName(user) };
}

/** Usernames to add and remove so the team matches the editor selection. */
export function memberDiff(current: string[], next: string[]): { add: string[]; remove: string[] } {
  const previous = new Set(current);
  const selected = new Set(next);
  return {
    add: [...selected].filter((username) => !previous.has(username)),
    remove: [...previous].filter((username) => !selected.has(username)),
  };
}

export function filterTeams<T extends { team_name: string }>(teams: T[], query: string): T[] {
  const term = query.trim().toLowerCase();
  if (!term) return teams;
  return teams.filter((team) => team.team_name.toLowerCase().includes(term));
}

/** Supervisors cannot reassign the primary supervisor. Admins can. */
export function supervisorPickerLocked(roles: string[]): boolean {
  return roles.includes("supervisor") && !roles.includes("admin");
}

/**
 * Admins can delete any team. A supervisor can delete a team they created.
 * Matches the teams screen in unified-admin.
 */
export function canDeleteTeam(input: { roles: string[]; username?: string; createdBy?: string }): boolean {
  if (input.roles.includes("admin")) return true;
  return Boolean(
    input.roles.includes("supervisor") &&
    input.createdBy &&
    input.username &&
    input.createdBy === input.username,
  );
}

export type TeamFieldError = "name-required" | "description-long" | "name-duplicate";

export function validateTeam(
  input: { name: string; description: string },
  existing: { team_Id: string; team_name: string }[],
  currentId?: string,
): TeamFieldError | null {
  const name = input.name.trim();
  if (!name) return "name-required";
  if (input.description.trim().length > 300) return "description-long";
  const duplicate = existing.some(
    (team) => team.team_Id !== currentId && team.team_name.trim().toLowerCase() === name.toLowerCase(),
  );
  return duplicate ? "name-duplicate" : null;
}

export function teamWriteBody(input: {
  name: string;
  description: string;
  supervisorId: string;
  createdBy?: string;
}): {
  team_name: string;
  description: string;
  supervisor_Id: string | null;
  source?: "CX";
  created_by?: string;
} {
  const body: {
    team_name: string;
    description: string;
    supervisor_Id: string | null;
    source?: "CX";
    created_by?: string;
  } = {
    team_name: input.name.trim(),
    description: input.description.trim(),
    supervisor_Id: input.supervisorId || null,
  };
  if (input.createdBy) {
    body.source = "CX";
    body.created_by = input.createdBy;
  }
  return body;
}

/** Directory results plus people already on the team, keyed by username. */
export function mergeDirectory(directory: TeamUser[], members: TeamMember[]): TeamUser[] {
  const byUsername = new Map<string, TeamUser>();
  for (const user of directory) byUsername.set(user.username, user);
  for (const member of members) {
    if (!byUsername.has(member.username)) {
      byUsername.set(member.username, { id: member.id, username: member.username, firstName: member.name });
    }
  }
  return [...byUsername.values()];
}
