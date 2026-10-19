import type { KeycloakUser } from "@/core/auth";

/** Insight screens that unified-agent renders as a Grafana kiosk iframe. */
export type InsightDashboard = "summary" | "agent-performance" | "team-stats" | "team-detail";

export function isSupervisor(user: KeycloakUser | null): boolean {
  return Boolean(user?.roles?.includes("supervisor"));
}

/** Supervised teams, plus the agent's own team when it is not already in the list. */
export function teamIdList(user: KeycloakUser | null): string {
  const teams = [...(user?.supervisedTeams ?? [])];
  const own = user?.userTeam;
  if (own?.teamId && !teams.some((team) => team.teamId === own.teamId)) teams.push(own);
  return teams
    .map((team) => team.teamId)
    .filter(Boolean)
    .join(",");
}

interface GrafanaInput {
  dashboard: InsightDashboard;
  gatUrl: string;
  /** Page origin, used when GAT_URL is a path so local dev hits the Vite proxy. */
  pageOrigin: string;
  refreshMs: number;
  user: KeycloakUser | null;
  theme: "light" | "dark";
  language: string;
  hostname: string;
}

/**
 * Same dashboard paths and variables as unified-agent's grafana, agent-performance,
 * supervisor-stats and supervisor-detail components.
 */
export function buildGrafanaUrl(input: GrafanaInput): string | null {
  if (!input.gatUrl) return null;
  let origin: string;
  try {
    origin = new URL(input.gatUrl, input.pageOrigin).origin;
  } catch {
    return null;
  }
  const refresh = Math.max(1, Math.round(input.refreshMs / 1000));
  const common = [
    "orgId=1",
    `refresh=${refresh}s`,
    `theme=${input.theme}`,
    `var-language_format_prefix=${input.language}`,
    `var-fqdn=${input.hostname}`,
    "kiosk=1",
  ].join("&");
  const username = input.user?.username ?? "";
  const userId = input.user?.id ?? "";
  const teams = teamIdList(input.user);

  if (input.dashboard === "summary") {
    if (isSupervisor(input.user)) {
      return `${origin}/grafana/d/0GEdiaunk/supervisor_dashboard_cim?${common}&var-teamIds=${teams}`;
    }
    return `${origin}/grafana/d/AGEdiaunk/agent_dashboard_cim?${common}&var-agentUserName=${username}`;
  }
  if (input.dashboard === "agent-performance") {
    return `${origin}/grafana/d/JN_LCzWHz12/agent-view-statistics?${common}&var-agentUserName=${username}&var-agentUserId=${userId}`;
  }
  if (input.dashboard === "team-stats") {
    return `${origin}/grafana/d/ggwEV4uNz/supervisor_dashboard-copy?${common}&var-teamIds=${teams}`;
  }
  return `${origin}/grafana/d/E2L3zGsNz/agent-teams-dashboard?${common}&var-teamIds=${teams}`;
}
