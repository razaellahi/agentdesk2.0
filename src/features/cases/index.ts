/** Case Management (case-management backend): Workbench, Create, Dashboard, Reports, Admin, conversation tab. */
export const CaseWorkbenchPage = () => import("./workbench/WorkbenchPage");
export const CaseCreatePage = () => import("./create/CreateCasePage");
export const CaseDashboardPage = () => import("./insights/DashboardPage");
export const CaseReportsPage = () => import("./insights/ReportsPage");
export const CaseAdminPage = () => import("./admin/CaseAdminPage");
export { CasesTab, type CaseConversationContext } from "./conversation/CasesTab";
export { CaseNotificationsMenu } from "./notifications/CaseNotificationsMenu";
export { caseManagementConfigured } from "./model/config";
export type {
  AdminStatus,
  Case,
  CaseAuditEntry,
  CaseNotification,
  Category,
  SlaThreshold,
  StatusTransition,
  TenantSettings,
} from "./api/types";
