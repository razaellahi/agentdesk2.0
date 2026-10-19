/** Workbench deep links shared by dashboard, reports and notifications (dashboard-workbench-links.ts). */

export type CaseListView = "unassigned" | "my" | "all" | "at_risk" | "breached" | "closed";
export type AssigneeFilterMode = "all" | "unassigned" | "me" | "assigned";
export type SlaDrill = "at-risk" | "breached" | "due-soon";

export const LIST_VIEWS: CaseListView[] = ["unassigned", "my", "at_risk", "breached", "all", "closed"];

export interface DrillParams {
  listView?: string;
  group?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  sla?: string;
  createdSince?: string;
  caseId?: string;
}

const DRILL_KEYS = [
  "listView",
  "group",
  "status",
  "priority",
  "assignee",
  "sla",
  "createdSince",
  "caseId",
] as const;

/** `/cases?…` link for the given drill parameters (empty values dropped). */
export function workbenchLink(params: DrillParams): string {
  const query = new URLSearchParams();
  for (const key of DRILL_KEYS) {
    const value = params[key];
    if (value) query.set(key, value);
  }
  const search = query.toString();
  return search ? `/cases?${search}` : "/cases";
}

export function parseCommaSeparated(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function utcStartOfToday(now = new Date()): Date {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

const isListView = (value: string | null): value is CaseListView =>
  value !== null && (LIST_VIEWS as string[]).includes(value);

/** Filter state a drill link asks for; null when the URL carries no filter keys. */
export interface DrillState {
  listView: CaseListView | null;
  group: string | null;
  statuses: Set<string> | null;
  priorities: Set<string> | null;
  assigneeFilter: AssigneeFilterMode;
  assigneeUserId: string | null;
  slaDueSoonOnly: boolean;
  createdSince: Date | null;
}

export function parseDrill(params: URLSearchParams): DrillState | null {
  const filterKeys = ["listView", "group", "status", "priority", "assignee", "sla", "createdSince"];
  if (!filterKeys.some((key) => params.get(key))) return null;
  const state: DrillState = {
    listView: null,
    group: null,
    statuses: null,
    priorities: null,
    assigneeFilter: "all",
    assigneeUserId: null,
    slaDueSoonOnly: false,
    createdSince: null,
  };
  const listView = params.get("listView");
  if (isListView(listView)) state.listView = listView;
  state.group = params.get("group") || null;
  const status = params.get("status");
  if (status) state.statuses = new Set(parseCommaSeparated(status));
  const priority = params.get("priority");
  if (priority) state.priorities = new Set(parseCommaSeparated(priority).map((p) => p.toUpperCase()));
  const assignee = params.get("assignee");
  if (assignee === "unassigned") state.assigneeFilter = "unassigned";
  else if (assignee) state.assigneeUserId = assignee;
  const sla = params.get("sla");
  if (sla === "due-soon") state.slaDueSoonOnly = true;
  else if (sla === "at-risk") state.listView = "at_risk";
  else if (sla === "breached") state.listView = "breached";
  const createdSince = params.get("createdSince");
  if (createdSince === "today") state.createdSince = utcStartOfToday();
  else if (createdSince) {
    const parsed = new Date(createdSince);
    if (!Number.isNaN(parsed.getTime())) state.createdSince = parsed;
  }
  return state;
}
