/** Case Management GraphQL shapes (case-console models/case.ts + inline page types). */

export type StatusCategory = "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
export type SlaState = "OK" | "WARNING" | "BREACHED";
export type DistributionMode = "MANUAL" | "AUTO";

export interface CaseStatus {
  id: string;
  code: string;
  label: string;
  /** OPEN / PENDING / RESOLVED / CLOSED. */
  statusCategory?: string | null;
  pausesSla?: boolean;
  isTerminal?: boolean;
  isResolvedState?: boolean;
}

export interface LinkedConversation {
  id: string;
  interactionId: string;
  linkedAt: string;
  customerName?: string | null;
  agentName?: string | null;
  channel?: string | null;
  /** AI summary pushed by EFCX after the chat ended. */
  summary?: string | null;
  summaryAt?: string | null;
  summarySource?: string | null;
}

export interface CaseAttachment {
  id: string;
  caseId: string;
  commentId: string | null;
  externalFileId: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  mediaUrl: string | null;
  createdAt: string;
}

export interface CaseComment {
  id: string;
  caseId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  attachments: CaseAttachment[];
}

export interface TaxonomyRef {
  id: string;
  code: string;
  name: string;
}

export interface Case {
  id: string;
  caseReferenceId: string;
  title: string;
  description: string | null;
  priority: string;
  customerProfileId: string | null;
  categoryId: string | null;
  subCategoryId: string | null;
  category: TaxonomyRef | null;
  subCategory: TaxonomyRef | null;
  assignedGroupId: string | null;
  assignedUserId: string | null;
  createdByUserId: string;
  customerTier?: string | null;
  resolutionDueAt: string | null;
  slaState: string | null;
  slaPausedAt?: string | null;
  slaMinutesRemaining: number | null;
  slaTimeLabel: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
  conversations: LinkedConversation[];
  attachments: CaseAttachment[];
  comments: CaseComment[];
}

/** Conversation-tab list rows (WidgetCaseFields): no comments/attachments. */
export type CaseSummary = Omit<Case, "comments" | "attachments" | "customerTier" | "slaPausedAt">;

export interface PageInfo {
  endCursor: string | null;
  hasNextPage: boolean;
}

export interface CaseConnection {
  nodes: Case[];
  pageInfo: PageInfo;
}

export interface CaseAuditFieldChange {
  field: string;
  fieldLabel: string;
  fromValue: string | null;
  toValue: string | null;
}

export interface CaseAuditEntry {
  id: string;
  caseId: string;
  action: string;
  actionLabel: string;
  performedBy: string;
  createdAt: string;
  changes: CaseAuditFieldChange[];
  summary: string | null;
}

export interface AttachmentInput {
  fileName: string;
  externalFileId: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export interface Me {
  userId: string;
  username: string | null;
  roles: string[];
  groups: string[];
}

export interface DistributionPolicy {
  distributionMode: DistributionMode;
  agentClaimEnabled: boolean;
  agentClaimAllowed: boolean;
  createAssigneeEnabled: boolean;
  dashboardRefreshSeconds: number;
}

export interface BulkResult {
  succeeded: { id: string; caseReferenceId?: string }[];
  failed: { caseId: string; code: string; message: string }[];
}

export interface DirectoryUser {
  userId: string;
  username: string | null;
  displayName: string | null;
}

export interface MentionTarget {
  kind: "USER" | "GROUP";
  id: string;
  label: string;
  description: string | null;
}

export interface RoutingGroup {
  id: string;
  name: string;
}

export interface RoutingGroupsPayload {
  status: "OK" | "EMPTY" | "UNAVAILABLE" | string;
  message: string | null;
  groups: RoutingGroup[];
}

export interface SubCategory {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
  sortOrder?: number;
  routingRule?: { id: string; keycloakGroupId: string; priority?: number; isActive?: boolean } | null;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
  sortOrder?: number;
  subCategories: SubCategory[];
}

export interface ResolvedRouting {
  keycloakGroupId: string | null;
  source: "ROUTING_RULE" | "DEFAULT" | "NONE" | string;
}

export interface TenantSettings {
  id: string;
  defaultAssignedGroupId: string | null;
  reopenDays: number;
  auditRetentionDays: number;
  recentCasesWindowHours: number;
  dashboardRefreshSeconds: number;
  distributionMode: DistributionMode;
  agentClaimEnabled: boolean;
  createAssigneeEnabled: boolean;
  updatedAt: string;
}

export interface SlaThreshold {
  id: string;
  customerTier: string | null;
  customerTierLabel: string;
  priority: string;
  resolutionMinutes: number;
  resolutionLabel: string;
  warningPercent: number;
}

export interface AdminStatus {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
  statusCategory: string;
  pausesSla: boolean;
  isActive: boolean;
  isSystem: boolean;
  isTerminal?: boolean;
  isResolvedState?: boolean;
  customerLabel: string | null;
}

export interface StatusTransition {
  id: string;
  isActive: boolean;
  requiredPermission?: string | null;
  fromStatus: { id: string; code: string; label: string };
  toStatus: { id: string; code: string; label: string };
}

export interface CaseNotification {
  id: string;
  recipientUserId?: string;
  caseId: string | null;
  type: string;
  title: string;
  body: string | null;
  payloadJson?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface CustomerCaseInsight {
  openCaseCount: number;
  windowHours: number;
  recentCases: CaseSummary[];
}

export interface CaseSearchHit {
  customerProfileId: string | null;
  customerDisplayLabel: string | null;
  matchesActiveCustomer: boolean;
  case: CaseSummary;
}

export interface CountByLabel {
  key: string;
  label: string;
  count: number;
}

export interface GroupMetrics {
  groupKey: string;
  groupLabel: string;
  openCount: number;
  unassignedCount: number;
  atRiskCount: number;
  breachedCount: number;
}

export interface SupervisorDashboard {
  totalOpen: number;
  totalUnassigned: number;
  totalAtRisk: number;
  totalBreached: number;
  groups: GroupMetrics[];
}

export interface OperationsDashboard {
  asOf: string;
  refreshIntervalSeconds: number;
  totals: {
    open: number;
    unassigned: number;
    atRisk: number;
    breached: number;
    createdToday: number;
    oldestOpenAgeMinutes: number | null;
  };
  byGroup: GroupMetrics[];
  byStatus: CountByLabel[];
  byPriority: CountByLabel[];
  byAssignee: { userId: string; openCount: number }[];
  dueSoon: {
    id: string;
    caseReferenceId: string;
    title: string;
    resolutionDueAt: string;
    slaState: string | null;
    assignedGroupId: string | null;
    priority: string;
  }[];
  velocity: { claimsLastHour: number; resolvesLastHour: number; reassignmentsLastHour: number };
}

export interface ReportFilter {
  dateFrom: string;
  dateTo: string;
  assignedGroupId?: string | null;
  assignedUserId?: string | null;
  statusId?: string | null;
  priority?: string | null;
  categoryId?: string | null;
  subCategoryId?: string | null;
  customerTier?: string | null;
}

export interface ReportMeta {
  generatedAt: string;
  dateFrom: string;
  dateTo: string;
  auditRetentionDays: number | null;
}

export interface WorkloadReport {
  meta: ReportMeta;
  openCount: number;
  unassignedCount: number;
  oldestOpenAgeMinutes: number | null;
  dueSoonCount: number;
  byStatus: CountByLabel[];
  byPriority: CountByLabel[];
  byRoutingGroup: CountByLabel[];
  byAssignee: { userId: string; count: number }[];
  bySlaState: CountByLabel[];
}

export interface SlaReport {
  meta: ReportMeta;
  currentAtRiskCount: number;
  currentBreachedCount: number;
  resolvedWithinSlaCount: number;
  resolvedAfterSlaCount: number;
  complianceRatePercent: number | null;
  averageResolutionMinutes: number | null;
  breachMixByPriority: CountByLabel[];
  breachMixByCustomerTier: CountByLabel[];
  breachMixByRoutingGroup: CountByLabel[];
  breachMixByAssignee: { userId: string; count: number }[];
}

export interface IntakeReport {
  meta: ReportMeta;
  createdCount: number;
  interactionLinkedCount: number;
  standaloneCount: number;
  interactionLinkedRatePercent: number | null;
  byDate: CountByLabel[];
  byCategory: CountByLabel[];
  bySubCategory: CountByLabel[];
  byRoutingGroup: CountByLabel[];
  byPriority: CountByLabel[];
  byCustomerTier: CountByLabel[];
}

export interface RecurrenceReport {
  meta: ReportMeta;
  recentCasesWindowHours: number;
  customersWithMultipleCases: number;
  byCustomerTier: CountByLabel[];
  rows: {
    customerProfileId: string;
    customerName: string | null;
    customerTier: string | null;
    caseCount: number;
    openCaseCount: number;
    interactionLinkedCount: number;
    recentRecurrenceCount: number;
  }[];
}

export interface ThroughputReport {
  meta: ReportMeta;
  totalClaims: number;
  totalAutoAssignments: number;
  totalReassignments: number;
  totalResolutions: number;
  totalReopens: number;
  totalClosures: number;
  byRoutingGroup: {
    groupKey: string;
    groupLabel: string;
    openLoad: number;
    claims: number;
    autoAssignments: number;
    reassignments: number;
    resolutions: number;
    reopens: number;
    closures: number;
    averageResolutionMinutes: number | null;
  }[];
  byAssignee: {
    userId: string;
    openLoad: number;
    claims: number;
    resolutions: number;
    averageResolutionMinutes: number | null;
  }[];
}

/** CIM customer as returned by the case backend proxy (/api/v1/cim). */
export interface CimCustomerDoc {
  _id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | string[] | null;
  phoneNumber?: string | string[] | null;
  labels?: string[] | null;
  isAnonymous?: boolean;
}

export interface CimLabel {
  _id: string;
  name: string;
  colorCode?: string;
}
