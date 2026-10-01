import { hasAnyScope, hasRole, hasScope, type PermissionSubject } from "./scopes";

/**
 * A permission requirement, declared once and reused by routes, navigation and
 * components. Rules mirror the source apps:
 *  - unified-agent auth.guard.ts / menu-config.service.ts
 *  - unified-admin auth.guard.ts (resource agent-desk-setting, view/manage)
 *  - VRS auth.service.ts (realm roles admin > supervisor > agent, plus download/export/viewtag/evaluatetag)
 */
export type Requirement =
  | { scope: [resource: string, scope: string] }
  | { anyScope: [resource: string, scopes: string[]] }
  | { role: string }
  | { anyOf: Requirement[] }
  | { allOf: Requirement[] }
  | { custom: (subject: PermissionSubject) => boolean };

export function satisfies(subject: PermissionSubject, req: Requirement | undefined): boolean {
  if (!req) return true;
  if ("scope" in req) return hasScope(subject, req.scope[0], req.scope[1]);
  if ("anyScope" in req) return hasAnyScope(subject, req.anyScope[0], req.anyScope[1]);
  if ("role" in req) return hasRole(subject, req.role);
  if ("anyOf" in req) return req.anyOf.some((r) => satisfies(subject, r));
  if ("allOf" in req) return req.allOf.every((r) => satisfies(subject, r));
  return req.custom(subject);
}

const scope = (resource: string, s: string): Requirement => ({ scope: [resource, s] });

/** VRS role ladder: admin(3) > supervisor(2) > agent(1). */
export function vrsRoleLevel(subject: PermissionSubject): 0 | 1 | 2 | 3 {
  if (hasRole(subject, "admin")) return 3;
  if (hasRole(subject, "supervisor")) return 2;
  if (hasRole(subject, "agent")) return 1;
  return 0;
}

const isAgentDashboardUser: Requirement = {
  custom: (s) => Boolean(s.user?.roles?.includes("agent")) && hasScope(s, "agent-dashboard", "view"),
};

export const PERMISSIONS = {
  // --- Agent session: socket/telephony/agent-state only start for these users.
  agentSession: { anyOf: [{ role: "agent" }, { role: "supervisor" }] },

  // --- Workspace (unified-agent)
  conversations: { anyOf: [{ role: "agent" }, { role: "supervisor" }] },
  customerList: scope("customer", "view"),
  customerManage: scope("customer", "manage"),
  customerLabels: scope("customer-labels", "assign_label"),
  customerLabelsManage: scope("customer-labels", "manage"),
  customerSchema: scope("customer-schema", "view"),
  customerSchemaManage: scope("customer-schema", "manage"),
  subscribedLists: scope("subscribed-list", "view"),
  subscribedListsManage: scope("subscribed-list", "manage"),
  stateChange: scope("state-change", "manage_state_change"),
  viewPii: scope("customer", "view_pii"),
  maskedPii: scope("customer", "masked_pii"),

  // --- Supervisor & dashboards
  supervisor: scope("supervisor", "view_all"),
  /** Summary/agents/performance dashboards: supervisors, or agents with agent-dashboard:view. */
  dashboards: { anyOf: [scope("supervisor", "view_all"), isAgentDashboardUser] },
  agentPerformance: isAgentDashboardUser,
  recentConversations: { anyOf: [{ role: "agent" }, { role: "supervisor" }] },

  // --- Recordings (VRS)
  recordings: { anyOf: [{ role: "admin" }, { role: "supervisor" }, { role: "agent" }] },
  recordingsManage: { custom: (s) => vrsRoleLevel(s) >= 2 },
  recordingsDownload: { role: "download" },
  recordingsExport: { role: "export" },
  recordingTagsView: { anyOf: [{ role: "viewtag" }, { role: "evaluatetag" }] },
  recordingTagsAssign: { role: "evaluatetag" },
  recordingTagsManage: { role: "admin" },

  // --- Admin: Agent Desk settings (unified-admin resource agent-desk-setting)
  adminSettings: { anyScope: ["agent-desk-setting", ["view", "configurations-view", "manage"]] },
  adminSettingsManage: scope("agent-desk-setting", "manage"),
} satisfies Record<string, Requirement>;

export type PermissionKey = keyof typeof PERMISSIONS;
