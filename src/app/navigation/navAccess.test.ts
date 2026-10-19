import { describe, expect, it } from "vitest";
import { setConfig } from "@/config";
import { resolveDeskSettings } from "@/core/agent-settings/resolve";
import { makeConfig } from "@/test/fixtures";
import { MOCK_DESK_SETTINGS, MOCK_USERS } from "@/test/msw/data";
import { ALL_NAV_ITEMS } from "./navConfig";
import { navItemAccess } from "./useNavigation";

const settings = resolveDeskSettings(MOCK_DESK_SETTINGS);

function modules(user: keyof typeof MOCK_USERS, profile: "EFCX" | "CISCO") {
  setConfig(
    makeConfig({
      DEPLOYMENT_PROFILE: profile,
      feature_recordings: true,
      feature_CIM_32834_customisedDashboard: true,
    }),
  );
  const { user: keycloak, realmRoles } = MOCK_USERS[user]!;
  return ALL_NAV_ITEMS.filter(
    (item) => navItemAccess(item, { user: keycloak, realmRoles }, settings) === "allowed",
  ).map((item) => item.id);
}

/**
 * Role matrix, one row per test user. Sources: unified-agent menu-config.service.ts
 * and auth.guard.ts, VRS origin/develop app-header and auth.guard, unified-admin
 * agent-desk-setting view/manage. Change these only together with the rule.
 */
describe("role-based module access", () => {
  it("agent: own work, own dashboards (agent-dashboard:view), own recordings", () => {
    expect(modules("agent", "EFCX")).toEqual([
      "conversations",
      "customers",
      "labels",
      "voicemail",
      "agents",
      "recent",
      "summary",
      "agent-performance",
      "realtime",
      "recordings",
    ]);
  });

  it("supervisor: monitoring and team dashboards; VRS supervisor screens by profile", () => {
    const common = [
      "conversations",
      "customers",
      "labels",
      "schema",
      "voicemail",
      "subscribed-lists",
      "live",
      "queues",
      "agents",
      "recent",
      "announcements",
      "summary",
      "team-stats",
      "team-detail",
      "realtime",
      "recordings",
      "audit-logs",
    ];
    const administration = ["teams", "qm-models"];
    expect(modules("supervisor", "EFCX")).toEqual([...common, "archival", ...administration]);
    // Recording Rules exist on CISCO only; Tag Management also needs the VRS admin role.
    expect(modules("supervisor", "CISCO")).toEqual([
      ...common,
      "recording-rules",
      "archival",
      ...administration,
    ]);
  });

  it("admin (no agent role): VRS administration and Agent Desk settings, no agent session screens", () => {
    expect(modules("admin", "EFCX")).toEqual([
      "recordings",
      "audit-logs",
      "archival",
      "admin-settings",
      "teams",
      "qm-models",
    ]);
    expect(modules("admin", "CISCO")).toEqual([
      "recordings",
      "audit-logs",
      "recording-rules",
      "archival",
      "recording-tags",
      "admin-settings",
      "teams",
      "qm-models",
    ]);
  });

  it("settings viewer: read-only Agent Desk settings only", () => {
    expect(modules("viewer", "EFCX")).toEqual(["admin-settings"]);
  });

  it("explains why a module is closed: permission versus deployment", () => {
    setConfig(makeConfig({ DEPLOYMENT_PROFILE: "EFCX", feature_recordings: true }));
    const rules = ALL_NAV_ITEMS.find((item) => item.id === "recording-rules")!;
    const { user, realmRoles } = MOCK_USERS.supervisor!;
    expect(navItemAccess(rules, { user, realmRoles }, settings)).toBe("unavailable");
    const agent = MOCK_USERS.agent!;
    expect(navItemAccess(rules, { user: agent.user, realmRoles: agent.realmRoles }, settings)).toBe(
      "forbidden",
    );
  });

  it("Case Management modules follow case-* roles once CASE_API_URL is configured", () => {
    const cases = (user: keyof typeof MOCK_USERS, caseApi: string) => {
      setConfig(makeConfig({ CASE_API_URL: caseApi }));
      const entry = MOCK_USERS[user]!;
      return ALL_NAV_ITEMS.filter(
        (item) =>
          item.id.startsWith("cases-") &&
          navItemAccess(
            item,
            { user: entry.user, realmRoles: entry.realmRoles, clientRoles: entry.clientRoles },
            settings,
          ) === "allowed",
      ).map((item) => item.id);
    };
    const api = "https://efcx.expertflow.com/case-api";
    expect(cases("agent", api)).toEqual(["cases-workbench", "cases-new"]);
    expect(cases("supervisor", api)).toEqual([
      "cases-workbench",
      "cases-new",
      "cases-dashboard",
      "cases-reports",
    ]);
    expect(cases("admin", api)).toEqual([
      "cases-workbench",
      "cases-new",
      "cases-dashboard",
      "cases-reports",
      "cases-admin",
    ]);
    expect(cases("viewer", api)).toEqual([]);
    expect(cases("supervisor", "")).toEqual([]);
  });
});
