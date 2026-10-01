import {
  Activity,
  Archive,
  AudioLines,
  BarChart3,
  ClipboardList,
  Contact,
  Gauge,
  Languages,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  Megaphone,
  MessagesSquare,
  ScrollText,
  Settings2,
  ShieldCheck,
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
}

export interface NavSection {
  id: string;
  labelKey: string;
  items: NavItem[];
}

/**
 * The single source of truth for navigation, page titles and route permissions
 * (replaces unified-agent menu-config.service.ts, VRS app-header menu and the
 * unified-admin "Agent Desk" sidebar panel).
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: "workspace",
    labelKey: "nav.workspace",
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
    id: "supervise",
    labelKey: "nav.supervise",
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
    items: [
      {
        id: "admin-settings",
        path: "/admin/settings",
        labelKey: "nav.agent-desk-settings",
        icon: Settings2,
        permission: "adminSettings",
      },
      {
        id: "admin-languages",
        path: "/admin/languages",
        labelKey: "nav.languages",
        icon: Languages,
        permission: "adminSettings",
      },
      {
        id: "admin-translations",
        path: "/admin/translations",
        labelKey: "nav.translations",
        icon: ScrollText,
        permission: "adminSettings",
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
