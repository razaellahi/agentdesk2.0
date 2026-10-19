import type { CaseAuditEntry, CaseAuditFieldChange } from "../api/types";

/** One-line, Jira-style history summaries for the activity feed (case-activity-format.ts). */

export type TimelineDot = "system" | "user" | "status" | "success" | "warning" | "muted";
export type SummaryTone = "plain" | "muted" | "emphasis" | "from" | "to" | "warn";

export interface SummaryPart {
  text: string;
  tone?: SummaryTone;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

const HIDDEN_ACTIONS = new Set(["COMMENT_CREATED", "COMMENT_DELETED", "RESOLVE_HANDOFF_ACK"]);
const LIFECYCLE_ACTIONS = new Set([
  "CASE_CREATED",
  "CASE_CLAIMED",
  "CASE_AUTO_ASSIGNED",
  "CASE_REASSIGNED",
  "CASE_RESOLVED",
  "CASE_REOPENED",
  "CASE_CLOSED",
  "CASE_STATUS_CHANGED",
]);
const MEANINGFUL_FIELDS = new Set(["statusCode", "priority", "assignedUserId", "assignedGroupId", "title"]);

export function isVisibleHistoryEntry(entry: CaseAuditEntry): boolean {
  if (HIDDEN_ACTIONS.has(entry.action)) return false;
  if (LIFECYCLE_ACTIONS.has(entry.action)) return true;
  return entry.changes.some((c) => MEANINGFUL_FIELDS.has(c.field));
}

export function historyTimelineDot(entry: CaseAuditEntry): TimelineDot {
  if (entry.action === "CASE_CREATED") return "muted";
  if (entry.performedBy === "system") return "system";
  if (entry.action === "CASE_RESOLVED" || entry.action === "CASE_CLOSED") return "success";
  const priority = entry.changes.find((c) => c.field === "priority")?.toValue?.toUpperCase();
  if (priority === "CRITICAL" || priority === "HIGH") return "warning";
  if (entry.changes.some((c) => c.field === "statusCode")) return "status";
  return "user";
}

const part = (text: string, tone: SummaryTone = "plain"): SummaryPart => ({ text, tone });
const sep = () => part(" · ", "muted");

const STATUS_KEYS: Record<string, string> = {
  NEW: "cases.status.new",
  UNASSIGNED: "cases.status.unassigned",
  IN_PROGRESS: "cases.status.in-progress",
  PENDING_CUSTOMER: "cases.status.pending-customer",
  PENDING_INTERNAL: "cases.status.pending-internal",
  RESOLVED: "cases.status.resolved",
  CLOSED: "cases.status.closed",
};

export function statusLabel(code: string | null | undefined, t: Translate): string {
  if (!code) return "—";
  const key = STATUS_KEYS[code];
  if (key) return t(key);
  return code
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPriority(value: string | null | undefined): string {
  if (!value) return "—";
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function groupLabel(groupId: string | null | undefined, t: Translate): string {
  if (!groupId) return t("cases.history.default-queue");
  return groupId.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const findChange = (entry: CaseAuditEntry, field: string) => entry.changes.find((c) => c.field === field);

function statusChangeParts(change: CaseAuditFieldChange, t: Translate): SummaryPart[] {
  return [
    part(t("cases.history.status-changed")),
    change.fromValue
      ? part(statusLabel(change.fromValue, t), "from")
      : part(t("cases.history.none"), "muted"),
    part(" → "),
    part(statusLabel(change.toValue, t), "to"),
  ];
}

function assigneeParts(toId: string | null | undefined, resolveUser: (id: string) => string, t: Translate) {
  return [
    part(t("cases.history.assigned-to")),
    part(toId ? resolveUser(toId) : t("cases.unassigned"), "emphasis"),
  ];
}

function priorityChangeParts(change: CaseAuditFieldChange, t: Translate): SummaryPart[] {
  const out = [part(t("cases.history.priority"))];
  if (change.fromValue) out.push(part(formatPriority(change.fromValue), "from"), part(" → "));
  out.push(
    part(formatPriority(change.toValue), change.toValue?.toUpperCase() === "CRITICAL" ? "warn" : "emphasis"),
  );
  return out;
}

function createdSummary(entry: CaseAuditEntry, t: Translate): SummaryPart[] {
  const ref = findChange(entry, "caseReferenceId")?.toValue;
  const priority = findChange(entry, "priority")?.toValue;
  const group = findChange(entry, "assignedGroupId")?.toValue;
  const status = findChange(entry, "statusCode")?.toValue;
  const out = ref
    ? [part(t("cases.history.case")), part(ref, "emphasis"), part(t("cases.history.created-suffix"))]
    : [part(t("cases.history.case-created"))];
  if (priority)
    out.push(sep(), part(formatPriority(priority), priority === "CRITICAL" ? "warn" : "emphasis"));
  if (group) out.push(sep(), part(groupLabel(group, t), "emphasis"));
  else if (status) out.push(sep(), part(statusLabel(status, t), "emphasis"));
  return out;
}

function primaryChange(entry: CaseAuditEntry): CaseAuditFieldChange | undefined {
  for (const field of ["assignedUserId", "assignedGroupId", "statusCode", "priority", "title"]) {
    const change = findChange(entry, field);
    if (change && change.fromValue !== change.toValue) return change;
  }
  return entry.changes[0];
}

function changeSummary(change: CaseAuditFieldChange, resolveUser: (id: string) => string, t: Translate) {
  switch (change.field) {
    case "statusCode":
      return statusChangeParts(change, t);
    case "assignedUserId":
      return assigneeParts(change.toValue, resolveUser, t);
    case "assignedGroupId":
      return [part(t("cases.history.routed-to")), part(groupLabel(change.toValue, t), "emphasis")];
    case "priority":
      return priorityChangeParts(change, t);
    case "title": {
      const title = change.toValue?.trim();
      if (!title) return [part(t("cases.history.title-cleared"))];
      return [
        part(t("cases.history.title-set")),
        part(title.length > 48 ? `${title.slice(0, 45)}…` : title, "emphasis"),
      ];
    }
    default:
      return [part(change.fieldLabel), part(t("cases.history.updated"), "muted")];
  }
}

function lifecycleSummary(entry: CaseAuditEntry, resolveUser: (id: string) => string, t: Translate) {
  switch (entry.action) {
    case "CASE_CREATED":
      return createdSummary(entry, t);
    case "CASE_CLAIMED": {
      const to = findChange(entry, "assignedUserId")?.toValue;
      return to ? assigneeParts(to, resolveUser, t) : [part(t("cases.history.claimed"))];
    }
    case "CASE_AUTO_ASSIGNED": {
      const to = findChange(entry, "assignedUserId")?.toValue;
      return to
        ? [part(t("cases.history.auto-assigned-to")), part(resolveUser(to), "emphasis")]
        : [part(t("cases.history.auto-assigned"))];
    }
    case "CASE_REASSIGNED": {
      const primary = primaryChange(entry);
      return primary ? changeSummary(primary, resolveUser, t) : [part(t("cases.history.reassigned"))];
    }
    case "CASE_RESOLVED":
      return [part(t("cases.history.marked")), part(t("cases.status.resolved"), "to")];
    case "CASE_REOPENED": {
      const status = findChange(entry, "statusCode")?.toValue;
      return status
        ? [part(t("cases.history.reopened-as")), part(statusLabel(status, t), "emphasis")]
        : [part(t("cases.history.reopened"))];
    }
    case "CASE_CLOSED":
      return [part(t("cases.history.case")), part(t("cases.history.closed"), "emphasis")];
    default:
      return null;
  }
}

export function formatHistorySummary(
  entry: CaseAuditEntry,
  resolveUser: (id: string) => string,
  t: Translate,
): SummaryPart[] {
  const lifecycle = lifecycleSummary(entry, resolveUser, t);
  if (lifecycle) return lifecycle;
  const primary = primaryChange(entry);
  if (primary) return changeSummary(primary, resolveUser, t);
  return [part(entry.actionLabel.replace(/^\w/, (c) => c.toUpperCase()))];
}
