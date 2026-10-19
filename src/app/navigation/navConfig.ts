import {
  Activity,
  Archive,
  AudioLines,
  BarChart3,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  Contact,
  FilePlus2,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  Megaphone,
  MessagesSquare,
  ScrollText,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  TableProperties,
  Tag,
  Users,
  UsersRound,
  Voicemail,
  type LucideIcon,
} from "lucide-react";
import type { RuntimeConfig } from "@/config";
import type { DeskSettings } from "@/core/agent-settings";
import type { PermissionKey } from "@/core/auth";

export interface NavContext {
  config: RuntimeConfig;
  settings: DeskSettings | null;
}

export interface NavItem {
  id: string;
  path: string;
  labelKey: string;
  icon: LucideIcon;
  permission?: PermissionKey;
  /** Extra availability rule (feature flag, deployment profile, desk setting). */
  enabled?: (ctx: NavContext) => boolean;
  /** Routed and permission-guarded, but reached from inside its module rather than the menu. */
  hidden?: boolean;
}

export interface NavSection {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  items: NavItem[];
}

/** Case Management lives on its own backend; no CASE_API_URL, no Cases module. */
export const caseManagementEnabled = ({ config }: NavContext) => Boolean(config.CASE_API_URL);

/**
 * The single source of truth for navigation, page titles and route permissions
 * (replaces unified-agent menu-config.service.ts, VRS app-header menu and the
 * unified-admin Agent Desk settings, Teams and QM models).
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: "workspace",
    labelKey: "nav.workspace",
    icon: MessagesSquare,
    items: [
      {
        id: "conversations",
        path: "/conversations",
        labelKey: "app-header.customer-conversation-view",
        icon: MessagesSquare,
        permission: "conversations",
      },
    ],
  },
  {
    id: "customers",
    labelKey: "nav.customers",
    icon: Contact,
    items: [
      {
        id: "customers",
        path: "/customers",
        labelKey: "app-header.customer-list-view",
        icon: Contact,
        permission: "customerList",
      },
      {
        id: "labels",
        path: "/customers/labels",
        labelKey: "app-header.customer-labels",
        icon: Tag,
        permission: "customerLabels",
      },
      {
        id: "schema",
        path: "/customers/schema",
        labelKey: "app-header.customer-schema",
        icon: TableProperties,
        permission: "customerSchema",
      },
      {
        id: "voicemail",
        path: "/voicemail",
        labelKey: "nav.voicemail",
        icon: Voicemail,
        permission: "conversations",
        enabled: ({ settings }) => Boolean(settings?.voicemail),
      },
      {
        id: "subscribed-lists",
        path: "/subscribed-lists",
        labelKey: "app-header.subscribed-lists",
        icon: ListChecks,
        permission: "subscribedLists",
      },
    ],
  },
  {
    id: "cases",
    labelKey: "nav.cases",
    icon: Briefcase,
    items: [
      {
        id: "cases-workbench",
        path: "/cases",
        labelKey: "nav.cases-workbench",
        icon: Briefcase,
        permission: "cases",
        enabled: caseManagementEnabled,
      },
      {
        id: "cases-new",
        path: "/cases/new",
        labelKey: "cases.create.title",
        icon: FilePlus2,
        permission: "cases",
        enabled: caseManagementEnabled,
        hidden: true,
      },
      {
        id: "cases-dashboard",
        path: "/cases/dashboard",
        labelKey: "nav.cases-dashboard",
        icon: LayoutDashboard,
        permission: "casesReports",
        enabled: caseManagementEnabled,
      },
      {
        id: "cases-reports",
        path: "/cases/reports",
        labelKey: "nav.cases-reports",
        icon: FileSpreadsheet,
        permission: "casesReports",
        enabled: caseManagementEnabled,
      },
      {
        id: "cases-admin",
        path: "/cases/admin",
        labelKey: "nav.cases-admin",
        icon: SlidersHorizontal,
        permission: "casesAdmin",
        enabled: caseManagementEnabled,
      },
    ],
  },
  {
    id: "supervise",
    labelKey: "nav.supervise",
    icon: Activity,
    items: [
      {
        id: "live",
        path: "/supervise/active",
        labelKey: "app-header.active-conversations-detail",
        icon: Activity,
        permission: "supervisor",
      },
      {
        id: "queues",
        path: "/supervise/queues",
        labelKey: "app-header.queued-conversations-detail",
        icon: ListOrdered,
        permission: "supervisor",
      },
      {
        id: "agents",
        path: "/supervise/agents",
        labelKey: "app-header.available-agents-detail",
        icon: UsersRound,
        permission: "dashboards",
      },
      {
        id: "recent",
        path: "/supervise/recent",
        labelKey: "app-header.recent-conversations-detail",
        icon: ClipboardList,
        permission: "recentConversations",
      },
      {
        id: "announcements",
        path: "/supervise/announcements",
        labelKey: "app-header.team-announcements",
        icon: Megaphone,
        permission: "supervisor",
      },
    ],
  },
  {
    id: "insights",
    labelKey: "nav.insights",
    icon: BarChart3,
    items: [
      {
        id: "summary",
        path: "/insights/summary",
        labelKey: "app-header.summary-dashboard",
        icon: LayoutDashboard,
        permission: "dashboards",
      },
      {
        id: "agent-performance",
        path: "/insights/agent-performance",
        labelKey: "app-header.agent-performance-dashboard",
        icon: Gauge,
        permission: "agentPerformance",
      },
      {
        id: "team-stats",
        path: "/insights/team-stats",
        labelKey: "app-header.supervisor-stats",
        icon: BarChart3,
        permission: "supervisor",
      },
      {
        id: "team-detail",
        path: "/insights/team-detail",
        labelKey: "app-header.supervisor-detail",
        icon: Users,
        permission: "supervisor",
      },
      {
        id: "realtime",
        path: "/insights/realtime",
        labelKey: "app-header.realtime-dashboard",
        icon: Activity,
        permission: "agentSession",
        enabled: ({ config }) => config.feature_CIM_32834_customisedDashboard,
      },
    ],
  },
  {
    id: "recordings",
    labelKey: "nav.recordings",
    icon: AudioLines,
    items: [
      {
        id: "recordings",
        path: "/recordings",
        labelKey: "nav.media-recordings",
        icon: AudioLines,
        permission: "recordings",
        enabled: ({ config }) => config.feature_recordings,
      },
      {
        id: "audit-logs",
        path: "/recordings/audit-logs",
        labelKey: "nav.audit-logs",
        icon: ScrollText,
        permission: "recordingsManage",
        enabled: ({ config }) => config.feature_recordings,
      },
      {
        id: "recording-rules",
        path: "/recordings/rules",
        labelKey: "nav.recording-rules",
        icon: ShieldCheck,
        permission: "recordingsManage",
        // VRS hides Recording Rules on the EFCX profile.
        enabled: ({ config }) => config.feature_recordings && config.DEPLOYMENT_PROFILE !== "EFCX",
      },
      {
        id: "archival",
        path: "/recordings/archival",
        labelKey: "nav.archival",
        icon: Archive,
        permission: "recordingsManage",
        enabled: ({ config }) => config.feature_recordings,
      },
      {
        id: "recording-tags",
        path: "/recordings/tags",
        labelKey: "nav.tag-management",
        icon: Tags,
        permission: "recordingTagsManage",
        enabled: ({ config }) => config.feature_recordings && config.DEPLOYMENT_PROFILE !== "EFCX",
      },
    ],
  },
  {
    id: "administration",
    labelKey: "nav.administration",
    icon: Settings2,
    items: [
      {
        id: "admin-settings",
        path: "/admin/settings",
        labelKey: "nav.agent-desk-settings",
        icon: Settings2,
        permission: "adminSettings",
      },
      {
        id: "teams",
        path: "/admin/teams",
        labelKey: "nav.teams",
        icon: Users,
        permission: "teams",
      },
      {
        id: "qm-models",
        path: "/admin/qm-models",
        labelKey: "nav.qm-models",
        icon: ClipboardCheck,
        permission: "qmModels",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export function navItemById(id: string): NavItem {
  const item = ALL_NAV_ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown nav item ${id}`);
  return item;
}
