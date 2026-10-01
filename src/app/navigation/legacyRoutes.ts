/**
 * Old URLs from the three retired apps (hash routes) mapped to Agent Desk 2.0
 * paths, so bookmarks, CRM/Finesse links and saved agentSetting.home_page values
 * keep working.
 */
const LEGACY: Record<string, string> = {
  // unified-agent
  "customers/chats": "/conversations",
  "customers/phonebook": "/customers",
  "customers/voicemail": "/voicemail",
  label: "/customers/labels",
  "subscribed-list": "/subscribed-lists",
  "customer-schema": "/customers/schema",
  "supervisor/dashboards": "/insights/summary",
  "supervisor/agent-performance": "/insights/agent-performance",
  "supervisor/supervisor-stats": "/insights/team-stats",
  "supervisor/supervisor-detail": "/insights/team-detail",
  "supervisor/recent-chats": "/supervise/recent",
  "supervisor/active-agents-detail": "/supervise/agents",
  "supervisor/queue-chats": "/supervise/queues",
  "supervisor/announcement": "/supervise/announcements",
  "supervisor/active-chats": "/supervise/active",
  "realtime-dashboard": "/insights/realtime",
  // VRS
  home: "/recordings",
  main: "/recordings",
  "audit-logs": "/recordings/audit-logs",
  "recording-rules": "/recordings/rules",
  archival: "/recordings/archival",
  tags: "/recordings/tags",
  // unified-admin (Agent Desk panel)
  "agent-desk": "/admin/settings",
  "agent-desk/languages": "/admin/languages",
  "agent-desk/translations": "/admin/translations",
  "general/locale-settings": "/admin/languages",
};

export function mapLegacyPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean =
    path
      .replace(/^#?\/?/, "")
      .replace(/\/$/, "")
      .split("?")[0] ?? "";
  if (!clean) return null;
  if (LEGACY[clean]) return LEGACY[clean]!;
  // Already a 2.0 path.
  return path.startsWith("/") ? path : `/${clean}`;
}

/** Reads a legacy `#/route` hash from the current URL, if present. */
export function legacyHashTarget(hash = globalThis.location.hash): string | null {
  if (!hash.startsWith("#/")) return null;
  const mapped = mapLegacyPath(hash);
  return mapped && mapped !== "/" ? mapped : null;
}
