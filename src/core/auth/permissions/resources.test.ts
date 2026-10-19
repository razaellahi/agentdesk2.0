import { describe, expect, it } from "vitest";
import type { PermissionSubject } from "./scopes";
import { PERMISSIONS, satisfies, vrsRoleLevel } from "./resources";

const subject = (
  roles: string[],
  resources: [string, string[]][] = [],
  realmRoles: string[] = [],
): PermissionSubject => ({
  user: {
    roles,
    permittedResources: { Resources: resources.map(([rsname, scopes]) => ({ rsname, scopes })) },
  },
  realmRoles,
});

describe("permission matrix", () => {
  it("agent dashboards: supervisors, or agents with agent-dashboard:view", () => {
    expect(satisfies(subject(["supervisor"], [["supervisor", ["view_all"]]]), PERMISSIONS.dashboards)).toBe(
      true,
    );
    expect(satisfies(subject(["agent"], [["agent-dashboard", ["view"]]]), PERMISSIONS.dashboards)).toBe(true);
    expect(satisfies(subject(["agent"]), PERMISSIONS.dashboards)).toBe(false);
  });

  it("trims resource and scope names like unified-agent checkScope", () => {
    expect(satisfies(subject([], [[" customer ", [" view "]]]), PERMISSIONS.customerList)).toBe(true);
  });

  it("teams and QM models need an admin or supervisor role and the resource", () => {
    const supervisor = subject(
      ["supervisor"],
      [
        ["teams", ["view"]],
        ["forms", ["view"]],
      ],
    );
    expect(satisfies(supervisor, PERMISSIONS.teams)).toBe(true);
    expect(satisfies(supervisor, PERMISSIONS.teamsManage)).toBe(false);
    expect(satisfies(supervisor, PERMISSIONS.qmModels)).toBe(true);
    expect(satisfies(supervisor, PERMISSIONS.qmModelsManage)).toBe(false);

    const admin = subject(
      ["admin"],
      [
        ["teams", ["manage"]],
        ["forms", ["manage"]],
      ],
    );
    expect(satisfies(admin, PERMISSIONS.teamsManage)).toBe(true);
    expect(satisfies(admin, PERMISSIONS.qmModelsManage)).toBe(true);

    const agent = subject(
      ["agent"],
      [
        ["teams", ["manage"]],
        ["forms", ["manage"]],
      ],
    );
    expect(satisfies(agent, PERMISSIONS.teams)).toBe(false);
    expect(satisfies(agent, PERMISSIONS.qmModelsManage)).toBe(false);
    expect(satisfies(subject(["supervisor"]), PERMISSIONS.teams)).toBe(false);
    expect(satisfies(subject(["admin"]), PERMISSIONS.qmModels)).toBe(false);
  });

  it("admin settings: view shows, manage edits", () => {
    const viewer = subject([], [["agent-desk-setting", ["view"]]]);
    expect(satisfies(viewer, PERMISSIONS.adminSettings)).toBe(true);
    expect(satisfies(viewer, PERMISSIONS.adminSettingsManage)).toBe(false);
    expect(
      satisfies(subject([], [["agent-desk-setting", ["manage"]]]), PERMISSIONS.adminSettingsManage),
    ).toBe(true);
  });

  it("VRS roles come from realm roles in the token", () => {
    const agent = subject([], [], ["agent", "download"]);
    expect(vrsRoleLevel(agent)).toBe(1);
    expect(satisfies(agent, PERMISSIONS.recordings)).toBe(true);
    expect(satisfies(agent, PERMISSIONS.recordingsManage)).toBe(false);
    expect(satisfies(agent, PERMISSIONS.recordingsDownload)).toBe(true);
    expect(satisfies(agent, PERMISSIONS.recordingsExport)).toBe(false);
    expect(vrsRoleLevel(subject([], [], ["supervisor", "agent"]))).toBe(2);
    expect(satisfies(subject([], [], ["admin"]), PERMISSIONS.recordingTagsManage)).toBe(true);
  });

  it("users without agent/supervisor role get no agent session", () => {
    expect(satisfies(subject([], [["agent-desk-setting", ["manage"]]]), PERMISSIONS.agentSession)).toBe(
      false,
    );
    expect(satisfies(subject(["agent"]), PERMISSIONS.agentSession)).toBe(true);
  });
  it("VRS realm roles cannot start an agent session or read agent history", () => {
    const vrs = subject([], [], ["agent", "supervisor"]);
    expect(satisfies(vrs, PERMISSIONS.recordings)).toBe(true);
    expect(satisfies(vrs, PERMISSIONS.agentSession)).toBe(false);
    expect(satisfies(vrs, PERMISSIONS.conversations)).toBe(false);
    expect(satisfies(vrs, PERMISSIONS.recentConversations)).toBe(false);
    expect(satisfies(subject(["admin", "download"]), PERMISSIONS.recordingsManage)).toBe(false);
    expect(satisfies(subject(["download"]), PERMISSIONS.recordingsDownload)).toBe(false);
  });

  it("Case Management reads case-* roles from realm, token client roles and keycloak_User.roles", () => {
    const client = (roles: string[]): PermissionSubject => ({ ...subject([]), clientRoles: roles });
    expect(satisfies(client(["case-cc-agent"]), PERMISSIONS.casesInConversation)).toBe(true);
    expect(satisfies(client(["case-cc-agent"]), PERMISSIONS.casesReports)).toBe(false);
    expect(satisfies(subject(["agent"]), PERMISSIONS.casesInConversation)).toBe(true);
    expect(satisfies(subject(["agent"]), PERMISSIONS.cases)).toBe(false);
    expect(satisfies(subject([], [], ["CASE-BACKOFFICE-MANAGER"]), PERMISSIONS.casesReports)).toBe(true);
    expect(satisfies(subject(["supervisor"]), PERMISSIONS.cases)).toBe(true);
    expect(satisfies(subject(["supervisor"]), PERMISSIONS.casesAdmin)).toBe(false);
    expect(satisfies(client(["case-admin"]), PERMISSIONS.casesAdmin)).toBe(true);
    expect(satisfies({ user: null, realmRoles: ["case-admin"] }, PERMISSIONS.casesAdmin)).toBe(false);
  });
});
