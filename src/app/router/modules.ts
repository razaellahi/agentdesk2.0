import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { AdminSettingsPage, QmModelsPage, TeamsPage } from "@/features/admin";
import {
  CaseAdminPage,
  CaseCreatePage,
  CaseDashboardPage,
  CaseReportsPage,
  CaseWorkbenchPage,
} from "@/features/cases";
import {
  CustomersPage,
  LabelsPage,
  SchemaPage,
  SubscribedListsPage,
  VoicemailPage,
} from "@/features/customers";
import {
  AgentPerformancePage,
  RealtimePage,
  SummaryPage,
  TeamDetailPage,
  TeamStatsPage,
} from "@/features/insights";
import { ArchivalPage, AuditLogsPage, RecordingsPage, RulesPage, TagsPage } from "@/features/recordings";
import { AgentsPage, AnnouncementsPage, LivePage, QueuesPage, RecentPage } from "@/features/supervise";
import { ConversationsPage } from "@/features/workspace";

/** Page component per navigation id. Each module is loaded on demand. */
export const LoginPage = lazy(() => import("@/features/auth/LoginRoute"));

export const MODULE_PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
  conversations: lazy(ConversationsPage),
  customers: lazy(CustomersPage),
  labels: lazy(LabelsPage),
  schema: lazy(SchemaPage),
  voicemail: lazy(VoicemailPage),
  "subscribed-lists": lazy(SubscribedListsPage),
  "cases-workbench": lazy(CaseWorkbenchPage),
  "cases-new": lazy(CaseCreatePage),
  "cases-dashboard": lazy(CaseDashboardPage),
  "cases-reports": lazy(CaseReportsPage),
  "cases-admin": lazy(CaseAdminPage),
  live: lazy(LivePage),
  queues: lazy(QueuesPage),
  agents: lazy(AgentsPage),
  recent: lazy(RecentPage),
  announcements: lazy(AnnouncementsPage),
  summary: lazy(SummaryPage),
  "agent-performance": lazy(AgentPerformancePage),
  "team-stats": lazy(TeamStatsPage),
  "team-detail": lazy(TeamDetailPage),
  realtime: lazy(RealtimePage),
  recordings: lazy(RecordingsPage),
  "audit-logs": lazy(AuditLogsPage),
  "recording-rules": lazy(RulesPage),
  archival: lazy(ArchivalPage),
  "recording-tags": lazy(TagsPage),
  "admin-settings": lazy(AdminSettingsPage),
  teams: lazy(TeamsPage),
  "qm-models": lazy(QmModelsPage),
};
