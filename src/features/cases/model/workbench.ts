import type { Case } from "../api/types";
import type { AssigneeFilterMode, CaseListView } from "./drill";
import {
  CLOSED_STATUS_CODES,
  CLOSED_STATUS_SET,
  OPEN_STATUS_CODES,
  OPEN_STATUS_SET,
  isOpenCase,
  normalizeGroupKey,
  slaSortRank,
} from "./format";

export interface WorkbenchFilters {
  listView: CaseListView;
  group: string | null;
  statuses: ReadonlySet<string>;
  priorities: ReadonlySet<string>;
  assignee: AssigneeFilterMode;
  assigneeUserId: string | null;
  slaDueSoonOnly: boolean;
  createdSince: Date | null;
  sortBySla: boolean;
}

/** Filters a list view resets to when the agent switches views (applyDefaultFiltersForView). */
export function defaultFiltersForView(view: CaseListView): Pick<WorkbenchFilters, "statuses" | "assignee"> & {
  sortBySla?: boolean;
} {
  switch (view) {
    case "unassigned":
      return { statuses: new Set(["NEW", "UNASSIGNED"]), assignee: "unassigned" };
    case "my":
      return { statuses: new Set(OPEN_STATUS_CODES), assignee: "me" };
    case "at_risk":
    case "breached":
      return { statuses: new Set(OPEN_STATUS_CODES), assignee: "all", sortBySla: true };
    case "closed":
      return { statuses: new Set(CLOSED_STATUS_CODES), assignee: "all", sortBySla: false };
    default:
      return { statuses: new Set(OPEN_STATUS_CODES), assignee: "all" };
  }
}

/** Client-side narrowing of the loaded pools (workbench.component.ts filteredCases). */
export function filterWorkbenchCases(
  source: Case[],
  f: WorkbenchFilters,
  currentUserId: string | null,
  now = Date.now(),
): Case[] {
  let list = source;
  if (f.group) {
    const key = f.group.toLowerCase();
    list = list.filter((c) => (c.assignedGroupId ? normalizeGroupKey(c.assignedGroupId) : "") === key);
  }
  if (f.statuses.size > 0) list = list.filter((c) => f.statuses.has(c.status.code));
  if (f.priorities.size > 0) list = list.filter((c) => f.priorities.has(c.priority.toUpperCase()));
  switch (f.assignee) {
    case "unassigned":
      list = list.filter((c) => !c.assignedUserId);
      break;
    case "me":
      list = currentUserId ? list.filter((c) => c.assignedUserId === currentUserId) : [];
      break;
    case "assigned":
      list = list.filter((c) => Boolean(c.assignedUserId));
      break;
  }
  if (f.assigneeUserId) list = list.filter((c) => c.assignedUserId === f.assigneeUserId);
  if (f.createdSince) {
    const since = f.createdSince.getTime();
    list = list.filter((c) => new Date(c.createdAt).getTime() >= since);
  }
  if (f.slaDueSoonOnly) {
    const cutoff = now + 2 * 60 * 60 * 1000;
    list = list.filter((c) => {
      if (!c.resolutionDueAt || !OPEN_STATUS_SET.has(c.status.code)) return false;
      const due = new Date(c.resolutionDueAt).getTime();
      return due >= now && due <= cutoff;
    });
  }
  if (f.listView === "at_risk")
    list = list.filter((c) => c.slaState === "WARNING" && OPEN_STATUS_SET.has(c.status.code));
  else if (f.listView === "breached")
    list = list.filter((c) => c.slaState === "BREACHED" && OPEN_STATUS_SET.has(c.status.code));
  else if (f.listView === "closed") list = list.filter((c) => CLOSED_STATUS_SET.has(c.status.code));
  if (f.sortBySla) {
    list = [...list].sort((a, b) => {
      const aDue = a.resolutionDueAt ? new Date(a.resolutionDueAt).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.resolutionDueAt ? new Date(b.resolutionDueAt).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return slaSortRank(b.slaState) - slaSortRank(a.slaState);
    });
  }
  return list;
}

export function countSlaInPool(cases: Case[], slaState: "WARNING" | "BREACHED"): number {
  return cases.filter((c) => c.slaState === slaState && OPEN_STATUS_SET.has(c.status.code)).length;
}

const lower = (roles: string[]) => new Set(roles.map((r) => r.toLowerCase()));

/** Backend `me` roles drive in-page actions; the server stays the authority. */
export function caseAbilities(roles: string[], currentUserId: string | null) {
  const held = lower(roles);
  const has = (...names: string[]) => names.some((n) => held.has(n));
  const tenantWide = has("case-superuser", "case-admin");
  const lifecycleOverride = has("case-superuser", "case-admin", "case-backoffice-manager", "supervisor");
  return {
    tenantWide,
    groupScopedSupervisor: has("case-backoffice-manager") && !tenantWide,
    seesSupervisorStrip: has("case-backoffice-manager") || tenantWide,
    /** Bulk reassign (workbench isReassignRole). */
    bulkReassign: has("case-backoffice-manager", "supervisor"),
    /** Detail-pane reassign (case-detail-pane canReassign). */
    reassign: has("case-backoffice-manager"),
    manageLifecycle: (c: Pick<Case, "assignedUserId">) =>
      lifecycleOverride || c.assignedUserId === currentUserId,
    deleteComment: (authorUserId: string) =>
      has("case-superuser", "case-admin", "case-backoffice-manager") || authorUserId === currentUserId,
    canBulkResolve: (c: Case) => isOpenCase(c) && (lifecycleOverride || c.assignedUserId === currentUserId),
  };
}

export type CaseAbilities = ReturnType<typeof caseAbilities>;
