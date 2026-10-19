import { describe, expect, it } from "vitest";
import type { KeycloakUser } from "@/core/auth";
import { buildGrafanaUrl, teamIdList } from "./grafanaUrl";

const user = {
  id: "agent-1",
  username: "sara",
  roles: ["agent", "supervisor"],
  supervisedTeams: [{ teamId: "t1", teamName: "Care" }],
  userTeam: { teamId: "t2", teamName: "Own" },
} as KeycloakUser;

const base = {
  gatUrl: "https://mtt02.expertflow.com/agent-manager",
  pageOrigin: "http://localhost:4200",
  refreshMs: 10000,
  user,
  theme: "dark" as const,
  language: "en",
  hostname: "localhost",
};

describe("grafana urls", () => {
  it("includes the agent's own team when they do not supervise it", () => {
    expect(teamIdList(user)).toBe("t1,t2");
  });

  it("points a supervisor summary at the CIM supervisor dashboard", () => {
    const url = buildGrafanaUrl({ ...base, dashboard: "summary" });
    expect(url).toContain("https://mtt02.expertflow.com/grafana/d/0GEdiaunk/supervisor_dashboard_cim?");
    expect(url).toContain("refresh=10s");
    expect(url).toContain("theme=dark");
    expect(url).toContain("var-teamIds=t1,t2");
    expect(url).toContain("kiosk=1");
  });

  it("points an agent summary at the agent dashboard", () => {
    const url = buildGrafanaUrl({
      ...base,
      dashboard: "summary",
      user: { ...user, roles: ["agent"] },
    });
    expect(url).toContain("/grafana/d/AGEdiaunk/agent_dashboard_cim?");
    expect(url).toContain("var-agentUserName=sara");
  });

  it("builds the agent performance, team stats and team detail boards", () => {
    expect(buildGrafanaUrl({ ...base, dashboard: "agent-performance" })).toContain(
      "/grafana/d/JN_LCzWHz12/agent-view-statistics?",
    );
    expect(buildGrafanaUrl({ ...base, dashboard: "team-stats" })).toContain(
      "/grafana/d/ggwEV4uNz/supervisor_dashboard-copy?",
    );
    expect(buildGrafanaUrl({ ...base, dashboard: "team-detail" })).toContain(
      "/grafana/d/E2L3zGsNz/agent-teams-dashboard?",
    );
  });
});
