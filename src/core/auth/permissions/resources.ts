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
  if (subject.user && subject.realmRoles.includes("admin")) return 3;
  if (subject.user && subject.realmRoles.includes("supervisor")) return 2;
  if (subject.user && subject.realmRoles.includes("agent")) return 1;
  return 0;
}

const isAgentDashboardUser: Requirement = {
  custom: (s) => Boolean(s.user?.roles?.includes("agent")) && hasScope(s, "agent-dashboard", "view"),
};

/**
 * Case Management roles. The case backend unions realm roles with the token's client
 * roles (backend/src/auth/jwt.ts); keycloak_User.roles is included for agent-manager users.
 */
export function caseRoles(subject: PermissionSubject): Set<string> {
  if (!subject.user) return new Set();
  return new Set(
    [...(subject.user.roles ?? []), ...subject.realmRoles, ...(subject.clientRoles ?? [])].map((role) =>
      role.toLowerCase(),
    ),
  );
}

const anyCaseRole = (...roles: string[]): Requirement => ({
  custom: (s) => {
    const held = caseRoles(s);
    return roles.some((role) => held.has(role));
  },
});

/** case-auth.ts CLAIM/lifecycle roles plus the widget agent: everyone the Workbench serves. */
export const CASE_WORKBENCH_ROLES = [
  "case-superuser",
  "case-admin",
  "case-backoffice-manager",
  "case-backoffice-member",
  "case-cc-agent",
  "supervisor",
];
/** case-auth.ts CREATE_CASE_ROLES: who may see and create cases from a conversation. */
export const CASE_CREATE_ROLES = [...CASE_WORKBENCH_ROLES, "agent"];
/** report-auth.ts / dashboard-access.ts. */
export const CASE_REPORT_ROLES = ["case-superuser", "case-admin", "case-backoffice-manager", "supervisor"];
/** admin-auth.ts. */
export const CASE_ADMIN_ROLES = ["case-superuser", "case-admin"];

/** unified-admin teams and forms screens branch on these Keycloak roles. */
const adminOrSupervisor: Requirement = { anyOf: [{ role: "admin" }, { role: "supervisor" }] };

export const PERMISSIONS = {
  // --- Agent session: socket/telephony/agent-state only start for these users.
  agentSession: {
    custom: (s) => Boolean(s.user?.roles?.some((role) => role === "agent" || role === "supervisor")),
  },

  // --- Workspace (unified-agent)
  conversations: {
    custom: (s) => Boolean(s.user?.roles?.some((role) => role === "agent" || role === "supervisor")),
  },
  directTransfer: scope("agent-conversation-control", "view_direct_transfer"),
  consult: scope("agent-conversation-control", "view_consult"),
  conference: scope("agent-conversation-control", "view_conference"),
  leaveChat: scope("agent-conversation-control", "view_leave_chat"),
  wrapUp: scope("agent-conversation-control", "view_wrap_up"),
  history: scope("agent-conversation-control", "view_history"),
  customerHistory: scope("agent-conversation-control", "view_history_active_customer"),
  callRecordingControl: scope("call_recording_control", "manage_call_recording_control"),
  customerViewInConversation: scope("customer", "view_in_conversation"),
  customerList: scope("customer", "view"),
  customerManage: scope("customer", "manage"),
  customerManageInConversation: scope("customer", "manage_in_conversation"),
  customerLabels: scope("customer-labels", "assign_label"),
  customerLabelsManage: scope("customer-labels", "manage"),
  customerSchema: scope("customer-schema", "view"),
  customerSchemaManage: scope("customer-schema", "manage"),
  initiateChat: scope("agent-conversation-control", "view_initiate_chat"),
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
  recentConversations: {
    custom: (s) => Boolean(s.user?.roles?.some((role) => role === "agent" || role === "supervisor")),
  },

  // --- Recordings (VRS)
  recordings: { custom: (s) => vrsRoleLevel(s) >= 1 },
  recordingsManage: { custom: (s) => vrsRoleLevel(s) >= 2 },
  recordingsDownload: { custom: (s) => Boolean(s.user) && s.realmRoles.includes("download") },
  recordingsExport: { custom: (s) => Boolean(s.user) && s.realmRoles.includes("export") },
  recordingTagsView: {
    custom: (s) =>
      Boolean(s.user) && s.realmRoles.some((role) => role === "viewtag" || role === "evaluatetag"),
  },
  recordingTagsAssign: { custom: (s) => Boolean(s.user) && s.realmRoles.includes("evaluatetag") },
  recordingTagsManage: { custom: (s) => Boolean(s.user) && s.realmRoles.includes("admin") },

  // --- Admin: Agent Desk settings (unified-admin resource agent-desk-setting)
  adminSettings: { anyScope: ["agent-desk-setting", ["view", "configurations-view", "manage"]] },
  adminSettingsManage: scope("agent-desk-setting", "manage"),
  /**
   * Teams (unified-admin). The menu needs the teams resource, and the screen
   * itself only loads for the admin and supervisor roles.
   */
  teams: {
    allOf: [adminOrSupervisor, { anyScope: ["teams", ["view", "configurations-view", "manage"]] }],
  },
  teamsManage: { allOf: [adminOrSupervisor, scope("teams", "manage")] },
  /** QM questionnaires (unified-admin forms). Same role gate as Teams. */
  qmModels: {
    allOf: [adminOrSupervisor, { anyScope: ["forms", ["view", "configurations-view", "manage"]] }],
  },
  qmModelsManage: { allOf: [adminOrSupervisor, scope("forms", "manage")] },

  // --- Case Management (case-management backend; in-page actions use the backend `me` roles)
  cases: anyCaseRole(...CASE_WORKBENCH_ROLES),
  casesInConversation: anyCaseRole(...CASE_CREATE_ROLES),
  casesReports: anyCaseRole(...CASE_REPORT_ROLES),
  casesAdmin: anyCaseRole(...CASE_ADMIN_ROLES),
} satisfies Record<string, Requirement>;

export type PermissionKey = keyof typeof PERMISSIONS;
