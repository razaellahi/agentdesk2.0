import { gql } from "./client";
import * as op from "./operations";
import type {
  AdminStatus,
  AttachmentInput,
  BulkResult,
  Case,
  CaseAuditEntry,
  CaseConnection,
  CaseNotification,
  CaseSearchHit,
  CaseStatus,
  CaseSummary,
  Category,
  CustomerCaseInsight,
  DirectoryUser,
  DistributionPolicy,
  IntakeReport,
  Me,
  MentionTarget,
  OperationsDashboard,
  RecurrenceReport,
  ReportFilter,
  ResolvedRouting,
  RoutingGroupsPayload,
  SlaReport,
  SlaThreshold,
  StatusTransition,
  SupervisorDashboard,
  TenantSettings,
  ThroughputReport,
  WorkloadReport,
} from "./types";

export * from "./types";
export * from "./client";

/** TanStack Query keys; everything under ["cases"] is invalidated after mutations. */
export const caseKeys = {
  all: ["cases"] as const,
  me: ["cases", "me"] as const,
  policy: ["cases", "policy"] as const,
  list: (kind: CaseListKind) => ["cases", "list", kind] as const,
  search: (query: string) => ["cases", "search", query] as const,
  detail: (id: string) => ["cases", "detail", id] as const,
  audit: (id: string) => ["cases", "audit", id] as const,
  transitions: (id: string) => ["cases", "transitions", id] as const,
  supervisor: ["cases", "supervisor"] as const,
  categories: ["cases", "categories"] as const,
  slaThresholds: ["cases", "admin", "sla"] as const,
  notifications: ["cases", "notifications"] as const,
  unread: ["cases", "notifications", "unread"] as const,
  interaction: (interactionId: string) => ["cases", "interaction", interactionId] as const,
  customerCases: (customerProfileId: string) => ["cases", "customer", customerProfileId] as const,
};

// --- Session & policy

export const fetchMe = () => gql<{ me: Me }>(op.ME_QUERY).then((d) => d.me);
export const fetchDistributionPolicy = () =>
  gql<{ distributionPolicy: DistributionPolicy }>(op.DISTRIBUTION_POLICY_QUERY).then(
    (d) => d.distributionPolicy,
  );

// --- Workbench

export type CaseListKind = "all" | "unassigned" | "my";

const LIST_QUERY: Record<CaseListKind, { query: string; field: "cases" | "unassignedCases" | "myCases" }> = {
  all: { query: op.CASES_QUERY, field: "cases" },
  unassigned: { query: op.UNASSIGNED_CASES_QUERY, field: "unassignedCases" },
  my: { query: op.MY_CASES_QUERY, field: "myCases" },
};

export async function listCases(
  kind: CaseListKind,
  first: number,
  after?: string | null,
): Promise<CaseConnection> {
  const { query, field } = LIST_QUERY[kind];
  const data = await gql<Record<string, CaseConnection>>(query, { first, after: after ?? undefined });
  return data[field] ?? { nodes: [], pageInfo: { endCursor: null, hasNextPage: false } };
}

export const searchWorkbenchCases = (query: string) =>
  gql<{ searchWorkbenchCases: Case[] }>(op.SEARCH_WORKBENCH_CASES_QUERY, {
    query,
    includeTerminal: true,
    limit: 50,
  }).then((d) => d.searchWorkbenchCases);

export const getCase = (id: string) => gql<{ case: Case | null }>(op.CASE_QUERY, { id }).then((d) => d.case);

export const fetchSupervisorDashboard = () =>
  gql<{ supervisorDashboard: SupervisorDashboard }>(op.SUPERVISOR_DASHBOARD_QUERY).then(
    (d) => d.supervisorDashboard,
  );

export const fetchCustomerOpenCaseCount = (customerProfileId: string) =>
  gql<{ customerCaseInsight: { openCaseCount: number } }>(op.CUSTOMER_CASE_INSIGHT_QUERY, {
    customerProfileId,
  }).then((d) => d.customerCaseInsight?.openCaseCount ?? 0);

export interface CreateCaseInput {
  title: string;
  description?: string | null;
  priority: string;
  customerProfileId?: string | null;
  customerTier?: string;
  interactionId?: string | null;
  categoryId?: string;
  subCategoryId?: string;
  assignedUserId?: string;
  attachments?: AttachmentInput[];
  customerName?: string | null;
  agentName?: string | null;
  channel?: string | null;
}

export const createCase = (input: CreateCaseInput) =>
  gql<{ createCase: Case }>(op.CREATE_CASE_MUTATION, { input }).then((d) => d.createCase);

export const claimCase = (caseId: string) =>
  gql<{ claimCase: Case }>(op.CLAIM_CASE_MUTATION, { caseId }).then((d) => d.claimCase);

export interface ReassignInput {
  assignedGroupId: string | null;
  assignedUserId: string | null;
  internalNote?: string;
}

export const reassignCase = (caseId: string, input: ReassignInput) =>
  gql<{ reassignCase: Case }>(op.REASSIGN_CASE_MUTATION, { input: { caseId, ...input } }).then(
    (d) => d.reassignCase,
  );

export const bulkClaimCases = (caseIds: string[]) =>
  gql<{ bulkClaimCases: BulkResult }>(op.BULK_CLAIM_CASES_MUTATION, { caseIds }).then(
    (d) => d.bulkClaimCases,
  );
export const bulkResolveCases = (caseIds: string[]) =>
  gql<{ bulkResolveCases: BulkResult }>(op.BULK_RESOLVE_CASES_MUTATION, { caseIds }).then(
    (d) => d.bulkResolveCases,
  );
export const bulkCloseCases = (caseIds: string[]) =>
  gql<{ bulkCloseCases: BulkResult }>(op.BULK_CLOSE_CASES_MUTATION, { caseIds }).then(
    (d) => d.bulkCloseCases,
  );
export const bulkReassignCases = (caseIds: string[], input: ReassignInput) =>
  gql<{ bulkReassignCases: BulkResult }>(op.BULK_REASSIGN_CASES_MUTATION, {
    input: { caseIds, ...input },
  }).then((d) => d.bulkReassignCases);

export const fetchRoutingGroupsForReassign = () =>
  gql<{ routingGroupsForReassign: RoutingGroupsPayload }>(op.ROUTING_GROUPS_FOR_REASSIGN_QUERY).then(
    (d) => d.routingGroupsForReassign,
  );
export const fetchRoutingGroupMembers = (groupKey: string) =>
  gql<{ routingGroupMembers: DirectoryUser[] }>(op.ROUTING_GROUP_MEMBERS_QUERY, { groupKey }).then(
    (d) => d.routingGroupMembers,
  );
export const fetchAssigneeCandidates = (groupKey: string) =>
  gql<{ createCaseAssigneeCandidates: DirectoryUser[] }>(op.CREATE_CASE_ASSIGNEE_CANDIDATES_QUERY, {
    groupKey,
  }).then((d) => d.createCaseAssigneeCandidates);

export const fetchCaseAuditLog = (caseId: string) =>
  gql<{ caseAuditLog: CaseAuditEntry[] }>(op.CASE_AUDIT_LOG_QUERY, { caseId }).then((d) => d.caseAuditLog);

export const fetchAllowedTransitions = (caseId: string) =>
  gql<{ allowedCaseTransitions: Required<CaseStatus>[] }>(op.ALLOWED_CASE_TRANSITIONS_QUERY, { caseId }).then(
    (d) => d.allowedCaseTransitions,
  );

export const addComment = (input: {
  caseId: string;
  body: string;
  attachments?: AttachmentInput[];
  customerProfileId?: string | null;
}) => gql<{ addComment: Case }>(op.ADD_COMMENT_MUTATION, { input }).then((d) => d.addComment);

export const deleteComment = (commentId: string) =>
  gql<{ deleteComment: Case }>(op.DELETE_COMMENT_MUTATION, { commentId }).then((d) => d.deleteComment);

export const updateCase = (input: {
  caseId: string;
  targetStatusId: string;
  commentBody?: string;
  attachments?: AttachmentInput[];
}) => gql<{ updateCase: Case }>(op.UPDATE_CASE_MUTATION, { input }).then((d) => d.updateCase);

// --- Taxonomy, routing & admin

export const fetchCategories = () =>
  gql<{ categories: Category[] }>(op.CATEGORIES_QUERY).then((d) => d.categories);
export const resolveRouting = (categoryId: string, subCategoryId: string) =>
  gql<{ resolveRouting: ResolvedRouting }>(op.RESOLVE_ROUTING_QUERY, { categoryId, subCategoryId }).then(
    (d) => d.resolveRouting,
  );
export const fetchAdminCategories = () =>
  gql<{ adminCategories: Category[] }>(op.ADMIN_CATEGORIES_QUERY).then((d) => d.adminCategories);
export const fetchKeycloakRoutingGroups = () =>
  gql<{ keycloakRoutingGroups: RoutingGroupsPayload }>(op.KEYCLOAK_ROUTING_GROUPS_QUERY).then(
    (d) => d.keycloakRoutingGroups,
  );
export const fetchTenantSettings = () =>
  gql<{ tenantSettings: TenantSettings }>(op.TENANT_SETTINGS_QUERY).then((d) => d.tenantSettings);
export const updateTenantSettings = (input: Partial<Omit<TenantSettings, "id" | "updatedAt">>) =>
  gql<{ updateTenantSettings: TenantSettings }>(op.UPDATE_TENANT_SETTINGS_MUTATION, { input }).then(
    (d) => d.updateTenantSettings,
  );
export const upsertRoutingRule = (input: {
  categoryId: string;
  subCategoryId: string;
  keycloakGroupId: string;
}) => gql(op.UPSERT_ROUTING_RULE_MUTATION, { input });
export const createCategory = (name: string) => gql(op.CREATE_CATEGORY_MUTATION, { input: { name } });
export const updateCategory = (id: string, input: { name: string; isActive: boolean }) =>
  gql(op.UPDATE_CATEGORY_MUTATION, { id, input });
export const createSubCategory = (categoryId: string, name: string) =>
  gql(op.CREATE_SUB_CATEGORY_MUTATION, { input: { categoryId, name } });
export const updateSubCategory = (id: string, input: { name: string; isActive: boolean }) =>
  gql(op.UPDATE_SUB_CATEGORY_MUTATION, { id, input });

export interface SlaThresholdInput {
  customerTier: string | null;
  priority: string;
  resolutionMinutes: number;
  warningPercent: number;
}

export const fetchSlaThresholds = () =>
  gql<{ adminSlaThresholds: SlaThreshold[] }>(op.ADMIN_SLA_THRESHOLDS_QUERY).then(
    (d) => d.adminSlaThresholds,
  );
export const createSlaThreshold = (input: SlaThresholdInput) =>
  gql<{ createSlaThreshold: SlaThreshold }>(op.CREATE_SLA_THRESHOLD_MUTATION, { input }).then(
    (d) => d.createSlaThreshold,
  );
export const updateSlaThreshold = (id: string, input: SlaThresholdInput) =>
  gql<{ updateSlaThreshold: SlaThreshold }>(op.UPDATE_SLA_THRESHOLD_MUTATION, { id, input }).then(
    (d) => d.updateSlaThreshold,
  );
export const deleteSlaThreshold = (id: string) => gql(op.DELETE_SLA_THRESHOLD_MUTATION, { id });

export const fetchStatusesPage = () =>
  gql<{ adminCaseStatuses: AdminStatus[]; adminStatusTransitions: StatusTransition[] }>(
    op.ADMIN_STATUSES_PAGE_QUERY,
  );
export const createCaseStatus = (input: { label: string; statusCategory: string; pausesSla: boolean }) =>
  gql(op.CREATE_CASE_STATUS_MUTATION, { input });
export const updateCaseStatus = (id: string, input: { label?: string; pausesSla?: boolean }) =>
  gql(op.UPDATE_CASE_STATUS_MUTATION, { id, input });
export const deactivateCaseStatus = (id: string) => gql(op.DEACTIVATE_CASE_STATUS_MUTATION, { id });
export const upsertStatusTransition = (fromStatusId: string, toStatusId: string) =>
  gql(op.UPSERT_STATUS_TRANSITION_MUTATION, { input: { fromStatusId, toStatusId, isActive: true } });
export const deactivateStatusTransition = (id: string) =>
  gql(op.DEACTIVATE_STATUS_TRANSITION_MUTATION, { id });

// --- Notifications

export const fetchNotifications = () =>
  gql<{ notifications: CaseNotification[] }>(op.NOTIFICATIONS_QUERY, { limit: 30 }).then(
    (d) => d.notifications,
  );
export const fetchUnreadNotificationCount = () =>
  gql<{ unreadNotificationCount: number }>(op.UNREAD_NOTIFICATION_COUNT_QUERY).then(
    (d) => d.unreadNotificationCount,
  );
export const markNotificationRead = (id: string) => gql(op.MARK_NOTIFICATION_READ_MUTATION, { id });
export const markAllNotificationsRead = () => gql(op.MARK_ALL_NOTIFICATIONS_READ_MUTATION);

// --- Dashboard & reports

export const fetchOperationsDashboard = (groupKey: string | null, filter: ReportFilter | null) =>
  gql<{ operationsDashboard: OperationsDashboard }>(op.OPERATIONS_DASHBOARD_QUERY, {
    groupKey,
    filter: filter ?? undefined,
  }).then((d) => d.operationsDashboard);

export interface Reports {
  workload: WorkloadReport | null;
  sla: SlaReport | null;
  intake: IntakeReport | null;
  recurrence: RecurrenceReport | null;
  throughput: ThroughputReport | null;
}

export async function fetchReports(filter: ReportFilter): Promise<Reports> {
  const [w, s, i, r, t] = await Promise.all([
    gql<{ reportWorkloadSummary: WorkloadReport }>(op.REPORT_WORKLOAD_QUERY, { filter }),
    gql<{ reportSlaCompliance: SlaReport }>(op.REPORT_SLA_QUERY, { filter }),
    gql<{ reportIntakeRoutingMix: IntakeReport }>(op.REPORT_INTAKE_QUERY, { filter }),
    gql<{ reportCustomerRecurrence: RecurrenceReport }>(op.REPORT_RECURRENCE_QUERY, { filter }),
    gql<{ reportTeamThroughput: ThroughputReport }>(op.REPORT_THROUGHPUT_QUERY, { filter }),
  ]);
  return {
    workload: w.reportWorkloadSummary ?? null,
    sla: s.reportSlaCompliance ?? null,
    intake: i.reportIntakeRoutingMix ?? null,
    recurrence: r.reportCustomerRecurrence ?? null,
    throughput: t.reportTeamThroughput ?? null,
  };
}

// --- Directory

export const resolveUserDisplayNames = (userIds: string[]) =>
  gql<{ resolveUserDisplayNames: DirectoryUser[] }>(op.RESOLVE_USER_DISPLAY_NAMES_QUERY, { userIds }).then(
    (d) => d.resolveUserDisplayNames,
  );
export const fetchMentionTargets = (query: string) =>
  gql<{ mentionTargets: MentionTarget[] }>(op.MENTION_TARGETS_QUERY, { query, limit: 8 }).then(
    (d) => d.mentionTargets,
  );

// --- Conversation tab (widget operations)

export const fetchCustomerCaseInsight = (customerProfileId: string) =>
  gql<{ customerCaseInsight: CustomerCaseInsight }>(op.WIDGET_CUSTOMER_CASE_INSIGHT_QUERY, {
    customerProfileId,
  }).then((d) => d.customerCaseInsight);

export const fetchCasesForInteraction = (interactionId: string, customerProfileId: string | null) =>
  gql<{ casesForInteraction: CaseSummary[] }>(op.WIDGET_CASES_FOR_INTERACTION_QUERY, {
    interactionId,
    customerProfileId,
  }).then((d) => d.casesForInteraction);

export const createCaseFromConversation = (input: CreateCaseInput) =>
  gql<{ createCase: CaseSummary }>(op.WIDGET_CREATE_CASE_MUTATION, { input }).then((d) => d.createCase);

export const fetchWidgetCase = (id: string) =>
  gql<{ widgetCase: Case }>(op.WIDGET_CASE_QUERY, { id }).then((d) => d.widgetCase);

export const searchCustomerCases = (customerProfileId: string, query: string) =>
  gql<{ searchCustomerCases: CaseSearchHit[] }>(op.WIDGET_SEARCH_CUSTOMER_CASES_QUERY, {
    customerProfileId,
    query,
    includeTerminal: true,
    limit: 25,
    activeCustomerProfileId: customerProfileId,
  }).then((d) => d.searchCustomerCases);

export const searchAllCases = (query: string, activeCustomerProfileId: string) =>
  gql<{ searchCases: CaseSearchHit[] }>(op.WIDGET_SEARCH_CASES_QUERY, {
    query,
    includeTerminal: true,
    limit: 25,
    activeCustomerProfileId,
  }).then((d) => d.searchCases);

export interface LinkConversationInput {
  caseId: string;
  interactionId: string;
  customerProfileId: string | null;
  customerName: string | null;
  agentName: string | null;
  channel: string | null;
}

export const linkConversationToCase = (input: LinkConversationInput) =>
  gql<{ linkConversationToCase: Case }>(op.WIDGET_LINK_CONVERSATION_TO_CASE_MUTATION, { input }).then(
    (d) => d.linkConversationToCase,
  );

export const addCommentFromConversation = (input: {
  caseId: string;
  customerProfileId: string | null;
  body: string;
}) => gql<{ addComment: Case }>(op.WIDGET_ADD_COMMENT_MUTATION, { input }).then((d) => d.addComment);
