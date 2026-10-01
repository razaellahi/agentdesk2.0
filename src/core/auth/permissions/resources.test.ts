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
});
