import { http, HttpResponse, type HttpHandler } from "msw";
import type {
  AdminStatus,
  Case,
  CaseAuditEntry,
  CaseNotification,
  Category,
  SlaThreshold,
  StatusTransition,
  TenantSettings,
} from "@/features/cases";
import { isoMinutesAgo } from "./demoTime";

/**
 * In-memory Case Management backend for `pnpm mock`, unit and e2e tests. It answers
 * the case-console GraphQL operations by operation name and the /api/v1 REST routes.
 * Roles and the user id come from the desk token, like backend/src/auth/jwt.ts.
 */

const DIRECTORY = [
  { userId: "u-agent-1", username: "agent", displayName: "Sana Iqbal", groups: ["billing"] },
  { userId: "u-sup-1", username: "supervisor", displayName: "Omar Khan", groups: ["billing", "technical"] },
  { userId: "u-admin-1", username: "admin", displayName: "Ayesha Malik", groups: [] },
  { userId: "u-bo-1", username: "bilal.bo", displayName: "Bilal Hassan", groups: ["technical"] },
];

const GROUPS = [
  { id: "kc-billing", name: "Billing" },
  { id: "kc-technical", name: "Technical" },
];

const STATUS_ROWS: AdminStatus[] = [
  ["NEW", "New", "OPEN", false],
  ["UNASSIGNED", "Unassigned", "OPEN", false],
  ["IN_PROGRESS", "In progress", "OPEN", false],
  ["PENDING_CUSTOMER", "Pending customer", "PENDING", true],
  ["PENDING_INTERNAL", "Pending internal", "PENDING", false],
  ["RESOLVED", "Resolved", "RESOLVED", true],
  ["CLOSED", "Closed", "CLOSED", true],
].map(([code, label, statusCategory, pausesSla], index) => ({
  id: `st-${String(code).toLowerCase()}`,
  code: code as string,
  label: label as string,
  sortOrder: index,
  statusCategory: statusCategory as string,
  pausesSla: pausesSla as boolean,
  isActive: true,
  isSystem: true,
  isTerminal: code === "CLOSED" || code === "RESOLVED",
  isResolvedState: code === "RESOLVED",
  customerLabel: null,
}));

const TRANSITIONS: [string, string][] = [
  ["NEW", "IN_PROGRESS"],
  ["UNASSIGNED", "IN_PROGRESS"],
  ["IN_PROGRESS", "PENDING_CUSTOMER"],
  ["IN_PROGRESS", "PENDING_INTERNAL"],
  ["IN_PROGRESS", "RESOLVED"],
  ["PENDING_CUSTOMER", "IN_PROGRESS"],
  ["PENDING_INTERNAL", "IN_PROGRESS"],
  ["RESOLVED", "CLOSED"],
  ["RESOLVED", "IN_PROGRESS"],
];

function status(code: string) {
  const row = STATUS_ROWS.find((s) => s.code === code) ?? STATUS_ROWS[0]!;
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    statusCategory: row.statusCategory,
    pausesSla: row.pausesSla,
    isTerminal: row.isTerminal,
    isResolvedState: row.isResolvedState,
  };
}

function initialCategories(): Category[] {
  const sub = (id: string, name: string, group: string | null) => ({
    id,
    code: id,
    name,
    isActive: true,
    sortOrder: 0,
    routingRule: group ? { id: `rule-${id}`, keycloakGroupId: group, priority: 0, isActive: true } : null,
  });
  return [
    {
      id: "cat-billing",
      code: "billing",
      name: "Billing",
      isActive: true,
      sortOrder: 0,
      subCategories: [
        sub("sub-payment", "Payment failure", "billing"),
        sub("sub-refund", "Refund", "billing"),
      ],
    },
    {
      id: "cat-technical",
      code: "technical",
      name: "Technical",
      isActive: true,
      sortOrder: 1,
      subCategories: [sub("sub-connectivity", "Connectivity", "technical")],
    },
    {
      id: "cat-general",
      code: "general",
      name: "General",
      isActive: true,
      sortOrder: 2,
      subCategories: [sub("sub-service", "Service request", null)],
    },
  ];
}

const HOUR = 3_600_000;

function makeCase(n: number, patch: Partial<Case> & { code?: string }): Case {
  const created = new Date(Date.now() - (24 - n) * HOUR).toISOString();
  const { code = "IN_PROGRESS", ...rest } = patch;
  return {
    id: `case-${n}`,
    caseReferenceId: `CASE-20261019-0000${n}`,
    title: `Case ${n}`,
    description: null,
    priority: "Medium",
    customerProfileId: null,
    categoryId: "cat-billing",
    subCategoryId: "sub-payment",
    category: { id: "cat-billing", code: "billing", name: "Billing" },
    subCategory: { id: "sub-payment", code: "sub-payment", name: "Payment failure" },
    assignedGroupId: "billing",
    assignedUserId: null,
    createdByUserId: "u-sup-1",
    customerTier: null,
    resolutionDueAt: new Date(Date.now() + 6 * HOUR).toISOString(),
    slaState: "OK",
    slaPausedAt: null,
    slaMinutesRemaining: 360,
    slaTimeLabel: "6h left",
    resolvedAt: null,
    closedAt: null,
    createdAt: created,
    updatedAt: created,
    status: status(code),
    conversations: [],
    attachments: [],
    comments: [],
    ...rest,
  };
}

function initialCases(): Case[] {
  return [
    makeCase(1, {
      title: "Card payment declined twice",
      description: "Customer charged but order failed.",
      priority: "High",
      customerProfileId: "customer-a",
      assignedUserId: "u-agent-1",
      slaState: "WARNING",
      slaMinutesRemaining: 45,
      slaTimeLabel: "45m left",
      resolutionDueAt: new Date(Date.now() + 45 * 60_000).toISOString(),
      comments: [
        {
          id: "cm-1",
          caseId: "case-1",
          authorUserId: "u-sup-1",
          body: "Please check with the gateway, @[Sana Iqbal](u-agent-1).",
          createdAt: new Date(Date.now() - 2 * HOUR).toISOString(),
          updatedAt: new Date(Date.now() - 2 * HOUR).toISOString(),
          attachments: [],
        },
      ],
    }),
    makeCase(2, {
      title: "Refund not received",
      customerProfileId: "customer-a",
      code: "RESOLVED",
      resolvedAt: new Date().toISOString(),
      conversations: [
        {
          id: "lc-2",
          interactionId: "demo-refund",
          // The message in the customer's history where this case was raised (see history.ts).
          linkedAt: isoMinutesAgo(2874),
          customerName: "Amina",
          agentName: "Sana Iqbal",
          channel: "WEB",
          summary:
            "Customer returned an order and had not received the refund after 8 days. Escalated to billing.",
          summaryAt: isoMinutesAgo(2870),
          summarySource: "EFCX",
        },
      ],
    }),
    makeCase(3, {
      title: "Router keeps dropping",
      priority: "Critical",
      customerProfileId: "customer-b",
      code: "UNASSIGNED",
      assignedGroupId: "technical",
      categoryId: "cat-technical",
      subCategoryId: "sub-connectivity",
      category: { id: "cat-technical", code: "technical", name: "Technical" },
      subCategory: { id: "sub-connectivity", code: "sub-connectivity", name: "Connectivity" },
      slaState: "BREACHED",
      slaMinutesRemaining: -30,
      slaTimeLabel: "Overdue 30m",
      conversations: [
        {
          id: "lc-3",
          interactionId: "b",
          linkedAt: isoMinutesAgo(60),
          customerName: "Bilal",
          agentName: "Sana Iqbal",
          channel: "WHATSAPP",
          summary: "Customer reports intermittent drops every evening since the upgrade.",
          summaryAt: isoMinutesAgo(60),
          summarySource: "EFCX",
        },
      ],
    }),
    makeCase(4, { title: "Update billing address", code: "NEW", priority: "Low" }),
    makeCase(5, {
      title: "Duplicate invoice",
      code: "PENDING_CUSTOMER",
      assignedUserId: "u-sup-1",
      slaPausedAt: new Date().toISOString(),
    }),
    // Amina Raza of the mock phonebook (customer-amina), opened from Customers.
    makeCase(6, {
      title: "Delivery address change",
      customerProfileId: "customer-amina",
      priority: "Medium",
      assignedUserId: "u-agent-1",
      conversations: [
        {
          id: "lc-6",
          interactionId: "demo-address",
          linkedAt: isoMinutesAgo(285),
          customerName: "Amina Raza",
          agentName: "Sana Iqbal",
          channel: "WEB",
          summary:
            "Customer asked to change the delivery address on order 78210. Needs warehouse confirmation.",
          summaryAt: isoMinutesAgo(280),
          summarySource: "EFCX",
        },
      ],
    }),
    makeCase(7, {
      title: "Loyalty points missing",
      customerProfileId: "customer-amina",
      code: "CLOSED",
      closedAt: new Date(Date.now() - 2 * HOUR).toISOString(),
      resolvedAt: new Date(Date.now() - 3 * HOUR).toISOString(),
      conversations: [
        {
          id: "lc-7",
          interactionId: "demo-loyalty",
          linkedAt: isoMinutesAgo(1485),
          customerName: "Amina Raza",
          agentName: "Sana Iqbal",
          channel: "EMAIL",
          summary:
            "340 loyalty points from the October 3rd purchase were missing. Loyalty team approved a manual credit.",
          summaryAt: isoMinutesAgo(1480),
          summarySource: "EFCX",
        },
      ],
    }),
    // Cases raised from email threads (see history.ts), the usual way a case starts.
    makeCase(8, {
      title: "Invoice INV-20418 charged VAT to an exempt customer",
      description: "Customer is VAT exempt (certificate on file) but the invoice charged 20% VAT.",
      priority: "High",
      customerProfileId: "customer-chen",
      assignedUserId: "u-agent-1",
      code: "RESOLVED",
      createdAt: isoMinutesAgo(2380),
      updatedAt: isoMinutesAgo(1990),
      resolvedAt: isoMinutesAgo(1995),
      conversations: [
        {
          id: "lc-8",
          interactionId: "demo-vat",
          linkedAt: isoMinutesAgo(2380),
          customerName: "Chen Wei",
          agentName: "Sana Iqbal",
          channel: "EMAIL",
          summary:
            "Invoice INV-20418 charged 20% VAT although the company is exempt. Billing issued credit note CN-5521 and a corrected invoice with the same PO.",
          summaryAt: isoMinutesAgo(1990),
          summarySource: "EFCX",
        },
      ],
    }),
    makeCase(9, {
      title: "Warranty claim: blender jar cracked in transit",
      description: "New blender arrived with a cracked jar. Photos received by email.",
      priority: "Medium",
      customerProfileId: "customer-fatima",
      assignedUserId: "u-agent-1",
      categoryId: "cat-billing",
      subCategoryId: "sub-refund",
      createdAt: isoMinutesAgo(570),
      updatedAt: isoMinutesAgo(555),
      conversations: [
        {
          id: "lc-9",
          interactionId: "demo-warranty",
          linkedAt: isoMinutesAgo(570),
          customerName: "Fatima Noor",
          agentName: "Sana Iqbal",
          channel: "EMAIL",
          summary:
            "Blender (order 55102) arrived with a cracked jar. Customer sent photos; a replacement ships in 3 to 5 working days with no return needed.",
          summaryAt: isoMinutesAgo(555),
          summarySource: "EFCX",
        },
      ],
    }),
  ];
}

function initialState() {
  return {
    cases: initialCases(),
    seq: 8,
    audit: seedAudit(),
    categories: initialCategories(),
    statuses: structuredClone(STATUS_ROWS),
    transitions: TRANSITIONS.map(([from, to], i): StatusTransition => ({
      id: `tr-${i}`,
      isActive: true,
      requiredPermission: null,
      fromStatus: { id: `st-${from.toLowerCase()}`, code: from, label: status(from).label },
      toStatus: { id: `st-${to.toLowerCase()}`, code: to, label: status(to).label },
    })),
    settings: {
      id: "ts-1",
      defaultAssignedGroupId: "billing",
      reopenDays: 30,
      auditRetentionDays: 90,
      recentCasesWindowHours: 72,
      dashboardRefreshSeconds: 30,
      distributionMode: "MANUAL",
      agentClaimEnabled: true,
      createAssigneeEnabled: true,
      updatedAt: new Date().toISOString(),
    } as TenantSettings,
    thresholds: [
      {
        id: "sla-1",
        customerTier: null,
        customerTierLabel: "Default",
        priority: "High",
        resolutionMinutes: 240,
        resolutionLabel: "4h",
        warningPercent: 80,
      },
      {
        id: "sla-2",
        customerTier: "VIP",
        customerTierLabel: "VIP",
        priority: "High",
        resolutionMinutes: 60,
        resolutionLabel: "1h",
        warningPercent: 75,
      },
    ] as SlaThreshold[],
    notifications: [
      {
        id: "n-1",
        caseId: "case-1",
        type: "MENTION",
        title: "Omar Khan mentioned you on CASE-20261019-00001",
        body: "Please check with the gateway, @[Sana Iqbal](u-agent-1).",
        isRead: false,
        createdAt: new Date(Date.now() - 2 * HOUR).toISOString(),
      },
      {
        id: "n-2",
        caseId: "case-3",
        type: "SLA_BREACH",
        title: "CASE-20261019-00003 breached its SLA",
        body: null,
        isRead: false,
        createdAt: new Date(Date.now() - HOUR).toISOString(),
      },
    ] as CaseNotification[],
  };
}

/** History the seeded cases already have, as the backend audit log would return it. */
function seedAudit(): CaseAuditEntry[] {
  const at = (hoursAgo: number) => new Date(Date.now() - hoursAgo * HOUR).toISOString();
  const row = (
    id: string,
    caseId: string,
    action: string,
    performedBy: string,
    hoursAgo: number,
    changes: CaseAuditEntry["changes"],
  ) => ({
    id,
    caseId,
    action,
    actionLabel: action.toLowerCase().replace(/_/g, " "),
    performedBy,
    createdAt: at(hoursAgo),
    changes,
    summary: null,
  });
  const ch = (field: string, fromValue: string | null, toValue: string | null) => ({
    field,
    fieldLabel: field,
    fromValue,
    toValue,
  });
  return [
    row("seed-1", "case-1", "CASE_CREATED", "u-sup-1", 23, [
      ch("caseReferenceId", null, "CASE-20261019-00001"),
      ch("priority", null, "HIGH"),
      ch("assignedGroupId", null, "billing"),
    ]),
    row("seed-2", "case-1", "CASE_CLAIMED", "u-agent-1", 20, [ch("assignedUserId", null, "u-agent-1")]),
    row("seed-3", "case-1", "CASE_STATUS_CHANGED", "u-agent-1", 19, [ch("statusCode", "NEW", "IN_PROGRESS")]),
    row("seed-4", "case-3", "CASE_CREATED", "u-sup-1", 21, [
      ch("caseReferenceId", null, "CASE-20261019-00003"),
      ch("priority", null, "CRITICAL"),
      ch("assignedGroupId", null, "technical"),
    ]),
  ];
}

export let caseDb = initialState();

/** Test seam: fresh mock data. */
export function resetCaseDb() {
  caseDb = initialState();
}

interface Caller {
  userId: string;
  username: string;
  roles: string[];
  groups: string[];
}

function caller(request: Request): Caller {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as {
      sub?: string;
      preferred_username?: string;
      realm_access?: { roles?: string[] };
      resource_access?: Record<string, { roles?: string[] }>;
    };
    const userId = payload.sub ?? "u-agent-1";
    return {
      userId,
      username: payload.preferred_username ?? userId,
      roles: [...(payload.realm_access?.roles ?? []), ...(payload.resource_access?.cim?.roles ?? [])],
      groups: DIRECTORY.find((u) => u.userId === userId)?.groups ?? [],
    };
  } catch {
    return { userId: "u-agent-1", username: "agent", roles: [], groups: [] };
  }
}

const connection = (nodes: Case[]) => ({ nodes, pageInfo: { endCursor: null, hasNextPage: false } });
const byId = (id: unknown) => caseDb.cases.find((c) => c.id === id);
const isOpen = (c: Case) => !["RESOLVED", "CLOSED"].includes(c.status.code);

function audit(c: Case, by: string, action: string, changes: CaseAuditEntry["changes"] = []) {
  caseDb.audit.push({
    id: `au-${caseDb.audit.length + 1}`,
    caseId: c.id,
    action,
    actionLabel: action.toLowerCase().replace(/_/g, " "),
    performedBy: by,
    createdAt: new Date().toISOString(),
    changes,
    summary: null,
  });
}

function touch(c: Case, patch: Partial<Case>): Case {
  Object.assign(c, patch, { updatedAt: new Date().toISOString() });
  return c;
}

function setStatus(c: Case, code: string, by: string) {
  const from = c.status.code;
  touch(c, {
    status: status(code),
    resolvedAt: code === "RESOLVED" ? new Date().toISOString() : c.resolvedAt,
    closedAt: code === "CLOSED" ? new Date().toISOString() : c.closedAt,
  });
  audit(
    c,
    by,
    code === "RESOLVED" ? "CASE_RESOLVED" : code === "CLOSED" ? "CASE_CLOSED" : "CASE_STATUS_CHANGED",
    [{ field: "statusCode", fieldLabel: "Status", fromValue: from, toValue: code }],
  );
}

function bulk(ids: string[], apply: (c: Case) => string | null) {
  const succeeded: { id: string; caseReferenceId: string }[] = [];
  const failed: { caseId: string; code: string; message: string }[] = [];
  for (const id of ids) {
    const c = byId(id);
    const problem = c ? apply(c) : "Case not found";
    if (problem || !c) failed.push({ caseId: id, code: "FORBIDDEN", message: problem ?? "Case not found" });
    else succeeded.push({ id: c.id, caseReferenceId: c.caseReferenceId });
  }
  return { succeeded, failed };
}

const countBy = <T>(rows: T[], key: (row: T) => string, label: (key: string) => string = (k) => k) =>
  [...rows.reduce((m, r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1), new Map<string, number>())].map(
    ([k, count]) => ({
      key: k,
      label: label(k),
      count,
    }),
  );

function groupMetrics() {
  return GROUPS.map((g) => {
    const key = g.name.toLowerCase();
    const open = caseDb.cases.filter((c) => isOpen(c) && c.assignedGroupId === key);
    return {
      groupKey: key,
      groupLabel: g.name,
      openCount: open.length,
      unassignedCount: open.filter((c) => !c.assignedUserId).length,
      atRiskCount: open.filter((c) => c.slaState === "WARNING").length,
      breachedCount: open.filter((c) => c.slaState === "BREACHED").length,
    };
  });
}

function reportMeta(filter: { dateFrom: string; dateTo: string }) {
  return {
    generatedAt: new Date().toISOString(),
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
    auditRetentionDays: caseDb.settings.auditRetentionDays,
  };
}

function hit(c: Case, active: string | null | undefined) {
  return {
    customerProfileId: c.customerProfileId,
    customerDisplayLabel: c.customerProfileId,
    matchesActiveCustomer: !active || c.customerProfileId === active,
    case: c,
  };
}

function matches(c: Case, query: string) {
  const q = query.toLowerCase();
  return c.caseReferenceId.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
}

type Vars = Record<string, unknown> & { input?: Record<string, unknown> };
type Resolver = (vars: Vars, who: Caller) => unknown;

function linkConversation(c: Case, input: Record<string, unknown>) {
  if (!c.conversations.some((conv) => conv.interactionId === input.interactionId)) {
    c.conversations.push({
      id: `lc-${c.id}-${c.conversations.length + 1}`,
      interactionId: String(input.interactionId),
      linkedAt: new Date().toISOString(),
      customerName: (input.customerName as string) ?? null,
      agentName: (input.agentName as string) ?? null,
      channel: (input.channel as string) ?? null,
      summary: null,
      summaryAt: null,
      summarySource: null,
    });
  }
}

/** backend/src/auth/case-auth.ts canReadCase: tenant-wide roles, the assignee, or the case's group. */
function canReadCase(who: Caller, c: Case) {
  const roles = who.roles.map((r) => r.toLowerCase());
  if (roles.includes("case-superuser") || roles.includes("case-admin")) return true;
  if (c.assignedUserId) return c.assignedUserId === who.userId;
  return Boolean(c.assignedGroupId && who.groups.includes(c.assignedGroupId));
}

function createCase(input: Record<string, unknown>, who: Caller): Case {
  const n = caseDb.seq++;
  const category = caseDb.categories.find((cat) => cat.id === input.categoryId);
  const sub = category?.subCategories.find((s) => s.id === input.subCategoryId);
  const group = sub?.routingRule?.keycloakGroupId ?? caseDb.settings.defaultAssignedGroupId;
  const c = makeCase(n, {
    id: `case-${n}`,
    caseReferenceId: `CASE-20261019-${String(n).padStart(5, "0")}`,
    title: String(input.title),
    description: (input.description as string) ?? null,
    priority: String(input.priority ?? "Medium"),
    customerProfileId: (input.customerProfileId as string) ?? null,
    categoryId: category?.id ?? null,
    subCategoryId: sub?.id ?? null,
    category: category ? { id: category.id, code: category.code, name: category.name } : null,
    subCategory: sub ? { id: sub.id, code: sub.code, name: sub.name } : null,
    assignedGroupId: group,
    assignedUserId: (input.assignedUserId as string) ?? null,
    createdByUserId: who.userId,
    code: "NEW",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: ((input.attachments as Case["attachments"]) ?? []).map((a, i) => ({
      ...a,
      id: `att-${n}-${i}`,
      caseId: `case-${n}`,
      commentId: null,
      mediaUrl: null,
      createdAt: new Date().toISOString(),
    })),
  });
  if (input.interactionId) linkConversation(c, input);
  caseDb.cases.push(c);
  audit(c, who.userId, "CASE_CREATED", [
    { field: "caseReferenceId", fieldLabel: "Reference", fromValue: null, toValue: c.caseReferenceId },
    { field: "priority", fieldLabel: "Priority", fromValue: null, toValue: c.priority.toUpperCase() },
    { field: "assignedGroupId", fieldLabel: "Group", fromValue: null, toValue: group },
  ]);
  return c;
}

function addComment(c: Case, input: Record<string, unknown>, who: Caller): Case {
  c.comments.push({
    id: `cm-${Date.now()}-${c.comments.length}`,
    caseId: c.id,
    authorUserId: who.userId,
    body: String(input.body ?? input.commentBody ?? ""),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: ((input.attachments as Case["attachments"]) ?? []).map((a, i) => ({
      ...a,
      id: `att-c-${Date.now()}-${i}`,
      caseId: c.id,
      commentId: null,
      mediaUrl: null,
      createdAt: new Date().toISOString(),
    })),
  });
  return touch(c, {});
}

const caseOrThrow = (id: unknown) => {
  const c = byId(id);
  if (!c) throw new Error("Case not found");
  return c;
};

const RESOLVERS: Record<string, Resolver> = {
  Me: (_v, who) => ({
    me: { userId: who.userId, username: who.username, roles: who.roles, groups: who.groups },
  }),
  DistributionPolicy: () => ({
    distributionPolicy: {
      distributionMode: caseDb.settings.distributionMode,
      agentClaimEnabled: caseDb.settings.agentClaimEnabled,
      agentClaimAllowed:
        caseDb.settings.distributionMode === "MANUAL" ? caseDb.settings.agentClaimEnabled : true,
      createAssigneeEnabled: caseDb.settings.createAssigneeEnabled,
      dashboardRefreshSeconds: caseDb.settings.dashboardRefreshSeconds,
    },
  }),
  Cases: () => ({ cases: connection(caseDb.cases) }),
  UnassignedCases: () => ({
    unassignedCases: connection(caseDb.cases.filter((c) => !c.assignedUserId && isOpen(c))),
  }),
  MyCases: (_v, who) => ({
    myCases: connection(caseDb.cases.filter((c) => c.assignedUserId === who.userId)),
  }),
  SearchWorkbenchCases: (v) => ({
    searchWorkbenchCases: caseDb.cases.filter((c) => matches(c, String(v.query))),
  }),
  Case: (v) => ({ case: byId(v.id) ?? null }),
  CustomerCaseInsight: (v) => ({
    customerCaseInsight: {
      openCaseCount: caseDb.cases.filter((c) => c.customerProfileId === v.customerProfileId && isOpen(c))
        .length,
      windowHours: caseDb.settings.recentCasesWindowHours,
      recentCases: [],
    },
  }),
  SupervisorDashboard: () => {
    const groups = groupMetrics();
    const sum = (k: "openCount" | "unassignedCount" | "atRiskCount" | "breachedCount") =>
      groups.reduce((s, g) => s + g[k], 0);
    return {
      supervisorDashboard: {
        totalOpen: sum("openCount"),
        totalUnassigned: sum("unassignedCount"),
        totalAtRisk: sum("atRiskCount"),
        totalBreached: sum("breachedCount"),
        groups,
      },
    };
  },
  OperationsDashboard: (v) => {
    const open = caseDb.cases.filter((c) => isOpen(c) && (!v.groupKey || c.assignedGroupId === v.groupKey));
    return {
      operationsDashboard: {
        asOf: new Date().toISOString(),
        refreshIntervalSeconds: caseDb.settings.dashboardRefreshSeconds,
        totals: {
          open: open.length,
          unassigned: open.filter((c) => !c.assignedUserId).length,
          atRisk: open.filter((c) => c.slaState === "WARNING").length,
          breached: open.filter((c) => c.slaState === "BREACHED").length,
          createdToday: caseDb.cases.length,
          oldestOpenAgeMinutes: 1380,
        },
        byGroup: groupMetrics(),
        byStatus: countBy(
          open,
          (c) => c.status.code,
          (k) => status(k).label,
        ),
        byPriority: countBy(
          open,
          (c) => c.priority.toUpperCase(),
          (k) => k.charAt(0) + k.slice(1).toLowerCase(),
        ),
        byAssignee: countBy(
          open.filter((c) => c.assignedUserId),
          (c) => c.assignedUserId!,
        ).map((r) => ({ userId: r.key, openCount: r.count })),
        dueSoon: open
          .filter((c) => c.resolutionDueAt && new Date(c.resolutionDueAt).getTime() - Date.now() < 2 * HOUR)
          .map((c) => ({
            id: c.id,
            caseReferenceId: c.caseReferenceId,
            title: c.title,
            resolutionDueAt: c.resolutionDueAt!,
            slaState: c.slaState,
            assignedGroupId: c.assignedGroupId,
            priority: c.priority,
          })),
        velocity: { claimsLastHour: 2, resolvesLastHour: 1, reassignmentsLastHour: 0 },
      },
    };
  },
  CreateCase: (v, who) => ({ createCase: createCase(v.input!, who) }),
  WidgetCreateCase: (v, who) => ({ createCase: createCase(v.input!, who) }),
  ClaimCase: (v, who) => {
    const c = caseOrThrow(v.caseId);
    touch(c, { assignedUserId: who.userId, status: status("IN_PROGRESS") });
    audit(c, who.userId, "CASE_CLAIMED", [
      { field: "assignedUserId", fieldLabel: "Assignee", fromValue: null, toValue: who.userId },
    ]);
    return { claimCase: c };
  },
  BulkClaimCases: (v, who) => ({
    bulkClaimCases: bulk(v.caseIds as string[], (c) => {
      if (c.assignedUserId) return "Already assigned";
      touch(c, { assignedUserId: who.userId, status: status("IN_PROGRESS") });
      return null;
    }),
  }),
  RoutingGroupsForReassign: () => ({
    routingGroupsForReassign: { status: "OK", message: null, groups: GROUPS },
  }),
  KeycloakRoutingGroups: () => ({ keycloakRoutingGroups: { status: "OK", message: null, groups: GROUPS } }),
  RoutingGroupMembers: (v) => ({
    routingGroupMembers: DIRECTORY.filter((u) => u.groups.includes(String(v.groupKey))).map(
      ({ userId, username, displayName }) => ({ userId, username, displayName }),
    ),
  }),
  CreateCaseAssigneeCandidates: (v) => ({
    createCaseAssigneeCandidates: DIRECTORY.filter((u) => u.groups.includes(String(v.groupKey))).map(
      ({ userId, username, displayName }) => ({ userId, username, displayName }),
    ),
  }),
  ReassignCase: (v, who) => {
    const input = v.input!;
    const c = caseOrThrow(input.caseId);
    touch(c, {
      assignedGroupId: (input.assignedGroupId as string) ?? c.assignedGroupId,
      assignedUserId: (input.assignedUserId as string) ?? null,
    });
    audit(c, who.userId, "CASE_REASSIGNED", [
      { field: "assignedUserId", fieldLabel: "Assignee", fromValue: null, toValue: c.assignedUserId },
    ]);
    return { reassignCase: c };
  },
  BulkReassignCases: (v) => {
    const input = v.input!;
    return {
      bulkReassignCases: bulk(input.caseIds as string[], (c) => {
        touch(c, {
          assignedGroupId: (input.assignedGroupId as string) ?? c.assignedGroupId,
          assignedUserId: (input.assignedUserId as string) ?? null,
        });
        return null;
      }),
    };
  },
  BulkResolveCases: (v, who) => ({
    bulkResolveCases: bulk(v.caseIds as string[], (c) =>
      isOpen(c) ? (setStatus(c, "RESOLVED", who.userId), null) : "Case is not open",
    ),
  }),
  BulkCloseCases: (v, who) => ({
    bulkCloseCases: bulk(v.caseIds as string[], (c) =>
      c.status.code === "RESOLVED" ? (setStatus(c, "CLOSED", who.userId), null) : "Case is not resolved",
    ),
  }),
  CaseAuditLog: (v, who) => {
    if (!canReadCase(who, caseOrThrow(v.caseId))) throw new Error("Forbidden");
    return { caseAuditLog: caseDb.audit.filter((a) => a.caseId === v.caseId) };
  },
  AddComment: (v, who) => ({ addComment: addComment(caseOrThrow(v.input!.caseId), v.input!, who) }),
  WidgetAddComment: (v, who) => ({ addComment: addComment(caseOrThrow(v.input!.caseId), v.input!, who) }),
  DeleteComment: (v) => {
    const c = caseDb.cases.find((row) => row.comments.some((cm) => cm.id === v.commentId));
    if (!c) throw new Error("Comment not found");
    c.comments = c.comments.filter((cm) => cm.id !== v.commentId);
    return { deleteComment: touch(c, {}) };
  },
  AllowedCaseTransitions: (v) => {
    const c = caseOrThrow(v.caseId);
    const targets = caseDb.transitions
      .filter((tr) => tr.isActive && tr.fromStatus.code === c.status.code)
      .map((tr) => tr.toStatus.code);
    return { allowedCaseTransitions: [c.status.code, ...targets].map(status) };
  },
  UpdateCase: (v, who) => {
    const input = v.input!;
    const c = caseOrThrow(input.caseId);
    const target = caseDb.statuses.find((s) => s.id === input.targetStatusId);
    if (target && target.code !== c.status.code) setStatus(c, target.code, who.userId);
    if (input.commentBody || input.attachments) addComment(c, input, who);
    return { updateCase: c };
  },
  Categories: () => ({ categories: caseDb.categories.filter((c) => c.isActive) }),
  AdminCategories: () => ({ adminCategories: caseDb.categories }),
  ResolveRouting: (v) => {
    const sub = caseDb.categories.flatMap((c) => c.subCategories).find((s) => s.id === v.subCategoryId);
    const rule = sub?.routingRule?.keycloakGroupId;
    return {
      resolveRouting: rule
        ? { keycloakGroupId: rule, source: "ROUTING_RULE" }
        : {
            keycloakGroupId: caseDb.settings.defaultAssignedGroupId,
            source: caseDb.settings.defaultAssignedGroupId ? "DEFAULT" : "NONE",
          },
    };
  },
  TenantSettings: () => ({ tenantSettings: caseDb.settings }),
  UpdateTenantSettings: (v) => {
    Object.assign(caseDb.settings, v.input, { updatedAt: new Date().toISOString() });
    return { updateTenantSettings: caseDb.settings };
  },
  UpsertRoutingRule: (v) => {
    const input = v.input!;
    const sub = caseDb.categories.flatMap((c) => c.subCategories).find((s) => s.id === input.subCategoryId)!;
    sub.routingRule = {
      id: `rule-${sub.id}`,
      keycloakGroupId: String(input.keycloakGroupId),
      priority: 0,
      isActive: true,
    };
    return { upsertRoutingRule: { ...sub.routingRule, categoryId: input.categoryId, subCategoryId: sub.id } };
  },
  CreateCategory: (v) => {
    const name = String(v.input!.name);
    const row: Category = {
      id: `cat-${Date.now()}`,
      code: name.toLowerCase(),
      name,
      isActive: true,
      sortOrder: caseDb.categories.length,
      subCategories: [],
    };
    caseDb.categories.push(row);
    return { createCategory: row };
  },
  UpdateCategory: (v) => {
    const row = caseDb.categories.find((c) => c.id === v.id)!;
    Object.assign(row, v.input);
    return { updateCategory: row };
  },
  CreateSubCategory: (v) => {
    const cat = caseDb.categories.find((c) => c.id === v.input!.categoryId)!;
    const name = String(v.input!.name);
    const row = {
      id: `sub-${Date.now()}`,
      code: name.toLowerCase(),
      name,
      isActive: true,
      sortOrder: cat.subCategories.length,
      routingRule: null,
    };
    cat.subCategories.push(row);
    return { createSubCategory: row };
  },
  UpdateSubCategory: (v) => {
    const row = caseDb.categories.flatMap((c) => c.subCategories).find((s) => s.id === v.id)!;
    Object.assign(row, v.input);
    return { updateSubCategory: row };
  },
  AdminSlaThresholds: () => ({ adminSlaThresholds: caseDb.thresholds }),
  CreateSlaThreshold: (v) => {
    const input = v.input as unknown as SlaThreshold;
    const row = {
      ...input,
      id: `sla-${Date.now()}`,
      customerTierLabel: input.customerTier ?? "Default",
      resolutionLabel: `${input.resolutionMinutes}m`,
    };
    caseDb.thresholds.push(row);
    return { createSlaThreshold: row };
  },
  UpdateSlaThreshold: (v) => {
    const row = caseDb.thresholds.find((s) => s.id === v.id)!;
    Object.assign(row, v.input);
    return { updateSlaThreshold: row };
  },
  DeleteSlaThreshold: (v) => {
    caseDb.thresholds = caseDb.thresholds.filter((s) => s.id !== v.id);
    return { deleteSlaThreshold: true };
  },
  AdminStatusesPage: () => ({
    adminCaseStatuses: caseDb.statuses,
    adminStatusTransitions: caseDb.transitions,
  }),
  CreateCaseStatus: (v) => {
    const input = v.input!;
    const label = String(input.label);
    const row: AdminStatus = {
      id: `st-${Date.now()}`,
      code: label.toUpperCase().replace(/\s+/g, "_"),
      label,
      sortOrder: caseDb.statuses.length,
      statusCategory: String(input.statusCategory),
      pausesSla: Boolean(input.pausesSla),
      isActive: true,
      isSystem: false,
      customerLabel: null,
    };
    caseDb.statuses.push(row);
    return { createCaseStatus: row };
  },
  UpdateCaseStatus: (v) => {
    const row = caseDb.statuses.find((s) => s.id === v.id)!;
    Object.assign(row, v.input);
    return { updateCaseStatus: row };
  },
  DeactivateCaseStatus: (v) => {
    caseDb.statuses.find((s) => s.id === v.id)!.isActive = false;
    return { deactivateCaseStatus: true };
  },
  UpsertStatusTransition: (v) => {
    const input = v.input!;
    const from = caseDb.statuses.find((s) => s.id === input.fromStatusId)!;
    const to = caseDb.statuses.find((s) => s.id === input.toStatusId)!;
    const row: StatusTransition = {
      id: `tr-${Date.now()}`,
      isActive: true,
      requiredPermission: null,
      fromStatus: { id: from.id, code: from.code, label: from.label },
      toStatus: { id: to.id, code: to.code, label: to.label },
    };
    caseDb.transitions.push(row);
    return { upsertStatusTransition: row };
  },
  DeactivateStatusTransition: (v) => {
    caseDb.transitions.find((tr) => tr.id === v.id)!.isActive = false;
    return { deactivateStatusTransition: true };
  },
  Notifications: () => ({ notifications: caseDb.notifications }),
  UnreadNotificationCount: () => ({
    unreadNotificationCount: caseDb.notifications.filter((n) => !n.isRead).length,
  }),
  MarkNotificationRead: (v) => {
    const row = caseDb.notifications.find((n) => n.id === v.id)!;
    row.isRead = true;
    return { markNotificationRead: { id: row.id, isRead: true } };
  },
  MarkAllNotificationsRead: () => {
    caseDb.notifications.forEach((n) => (n.isRead = true));
    return { markAllNotificationsRead: true };
  },
  ReportWorkloadSummary: (v) => {
    const open = caseDb.cases.filter(isOpen);
    return {
      reportWorkloadSummary: {
        meta: reportMeta(v.filter as never),
        openCount: open.length,
        unassignedCount: open.filter((c) => !c.assignedUserId).length,
        oldestOpenAgeMinutes: 1380,
        dueSoonCount: 1,
        byStatus: countBy(
          open,
          (c) => c.status.code,
          (k) => status(k).label,
        ),
        byPriority: countBy(open, (c) => c.priority.toUpperCase()),
        byRoutingGroup: countBy(open, (c) => c.assignedGroupId ?? "none"),
        byAssignee: countBy(
          open.filter((c) => c.assignedUserId),
          (c) => c.assignedUserId!,
        ).map((r) => ({ userId: r.key, count: r.count })),
        bySlaState: countBy(open, (c) => c.slaState ?? "OK"),
      },
    };
  },
  ReportSlaCompliance: (v) => ({
    reportSlaCompliance: {
      meta: reportMeta(v.filter as never),
      currentAtRiskCount: 1,
      currentBreachedCount: 1,
      resolvedWithinSlaCount: 8,
      resolvedAfterSlaCount: 2,
      complianceRatePercent: 80,
      averageResolutionMinutes: 310,
      breachMixByPriority: [{ key: "CRITICAL", label: "Critical", count: 1 }],
      breachMixByCustomerTier: [{ key: "VIP", label: "VIP", count: 1 }],
      breachMixByRoutingGroup: [],
      breachMixByAssignee: [],
    },
  }),
  ReportIntakeRoutingMix: (v) => ({
    reportIntakeRoutingMix: {
      meta: reportMeta(v.filter as never),
      createdCount: caseDb.cases.length,
      interactionLinkedCount: 1,
      standaloneCount: caseDb.cases.length - 1,
      interactionLinkedRatePercent: 20,
      byDate: [{ key: "2026-10-19", label: "19 Oct", count: caseDb.cases.length }],
      byCategory: countBy(caseDb.cases, (c) => c.category?.name ?? "—"),
      bySubCategory: [],
      byRoutingGroup: countBy(caseDb.cases, (c) => c.assignedGroupId ?? "none"),
      byPriority: countBy(caseDb.cases, (c) => c.priority),
      byCustomerTier: [],
    },
  }),
  ReportCustomerRecurrence: (v) => ({
    reportCustomerRecurrence: {
      meta: reportMeta(v.filter as never),
      recentCasesWindowHours: caseDb.settings.recentCasesWindowHours,
      customersWithMultipleCases: 1,
      byCustomerTier: [],
      rows: [
        {
          customerProfileId: "customer-a",
          customerName: "Amina",
          customerTier: null,
          caseCount: 2,
          openCaseCount: 1,
          interactionLinkedCount: 0,
          recentRecurrenceCount: 2,
        },
      ],
    },
  }),
  ReportTeamThroughput: (v) => ({
    reportTeamThroughput: {
      meta: reportMeta(v.filter as never),
      totalClaims: 4,
      totalAutoAssignments: 0,
      totalReassignments: 1,
      totalResolutions: 3,
      totalReopens: 0,
      totalClosures: 1,
      byRoutingGroup: groupMetrics().map((g) => ({
        groupKey: g.groupKey,
        groupLabel: g.groupLabel,
        openLoad: g.openCount,
        claims: 2,
        autoAssignments: 0,
        reassignments: 0,
        resolutions: 1,
        reopens: 0,
        closures: 0,
        averageResolutionMinutes: 300,
      })),
      byAssignee: [
        { userId: "u-agent-1", openLoad: 1, claims: 2, resolutions: 2, averageResolutionMinutes: 280 },
      ],
    },
  }),
  ResolveUserDisplayNames: (v) => ({
    resolveUserDisplayNames: DIRECTORY.filter((u) => (v.userIds as string[]).includes(u.userId)).map(
      ({ userId, username, displayName }) => ({ userId, username, displayName }),
    ),
  }),
  MentionTargets: (v) => {
    const q = String(v.query ?? "").toLowerCase();
    return {
      mentionTargets: [
        ...DIRECTORY.map((u) => ({
          kind: "USER",
          id: u.userId,
          label: u.displayName,
          description: u.username,
        })),
        ...GROUPS.map((g) => ({
          kind: "GROUP",
          id: g.name.toLowerCase(),
          label: g.name,
          description: "Team",
        })),
      ].filter((m) => !q || m.label.toLowerCase().includes(q)),
    };
  },
  WidgetCustomerCaseInsight: (v) => {
    const rows = caseDb.cases.filter((c) => c.customerProfileId === v.customerProfileId);
    return {
      customerCaseInsight: {
        openCaseCount: rows.filter(isOpen).length,
        windowHours: caseDb.settings.recentCasesWindowHours,
        recentCases: rows,
      },
    };
  },
  WidgetCasesForInteraction: (v) => ({
    casesForInteraction: caseDb.cases.filter((c) =>
      c.conversations.some((conv) => conv.interactionId === v.interactionId),
    ),
  }),
  WidgetCase: (v) => ({ widgetCase: caseOrThrow(v.id) }),
  WidgetSearchCustomerCases: (v) => ({
    searchCustomerCases: caseDb.cases
      .filter(
        (c) =>
          c.customerProfileId === v.customerProfileId &&
          matches(c, String(v.query)) &&
          (v.includeTerminal !== false || isOpen(c)),
      )
      .map((c) => hit(c, v.activeCustomerProfileId as string)),
  }),
  WidgetSearchCases: (v) => ({
    searchCases: caseDb.cases
      .filter((c) => matches(c, String(v.query)) && (v.includeTerminal !== false || isOpen(c)))
      .map((c) => hit(c, v.activeCustomerProfileId as string)),
  }),
  WidgetLinkConversationToCase: (v, who) => {
    const c = caseOrThrow(v.input!.caseId);
    linkConversation(c, v.input!);
    audit(c, who.userId, "CONVERSATION_LINKED", [
      {
        field: "interactionId",
        fieldLabel: "Interaction",
        fromValue: null,
        toValue: String(v.input!.interactionId),
      },
    ]);
    return { linkConversationToCase: touch(c, {}) };
  },
};

const CIM_CUSTOMERS = [
  {
    _id: "customer-a",
    firstName: "Amina",
    lastName: "Raza",
    email: ["amina@example.com"],
    phoneNumber: ["+923001112233"],
    labels: ["lbl-vip"],
  },
  { _id: "customer-b", firstName: "Bilal", lastName: "Ahmed", phoneNumber: ["+923004445566"], labels: [] },
];
const CIM_LABELS = [
  { _id: "lbl-vip", name: "VIP", colorCode: "#d63b3b" },
  { _id: "lbl-gold", name: "Gold", colorCode: "#b45f06" },
];

export const caseHandlers: HttpHandler[] = [
  http.post("*/case-api/graphql", async ({ request }) => {
    const body = (await request.json()) as { query: string; variables?: Vars };
    const name = /^\s*(?:query|mutation)\s+(\w+)/m.exec(body.query)?.[1] ?? "";
    const resolve = RESOLVERS[name];
    if (!resolve)
      return HttpResponse.json({ data: null, errors: [{ message: `Mock: unknown operation ${name}` }] });
    try {
      return HttpResponse.json({ data: resolve(body.variables ?? {}, caller(request)) });
    } catch (error) {
      return HttpResponse.json({ data: null, errors: [{ message: (error as Error).message }] });
    }
  }),
  http.post("*/case-api/api/v1/cim/customers/search", async ({ request }) => {
    const { searchTerm } = (await request.json()) as { searchTerm: string };
    const q = searchTerm.toLowerCase();
    const docs = CIM_CUSTOMERS.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q));
    return HttpResponse.json({ data: { docs, totalDocs: docs.length } });
  }),
  http.get("*/case-api/api/v1/cim/customers/:id", ({ params }) => {
    const doc = CIM_CUSTOMERS.find((c) => c._id === params.id);
    return doc
      ? HttpResponse.json({ data: doc })
      : HttpResponse.json({ error: { message: "Not found" } }, { status: 404 });
  }),
  http.get("*/case-api/api/v1/cim/labels", () => HttpResponse.json({ data: CIM_LABELS })),
  http.get(
    "*/case-api/api/v1/console/:kind/export",
    ({ params }) =>
      new HttpResponse("reference,title\nCASE-20261019-00001,Card payment declined twice\n", {
        headers: {
          "content-type": "text/csv",
          "content-disposition": `attachment; filename="${String(params.kind)}-export.csv"`,
        },
      }),
  ),
];
