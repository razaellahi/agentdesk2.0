import { ApiError, cimCustomerApi, reportingApi } from "@/core/api";
import { createLogger } from "@/core/logging/logger";
import { sessionStore } from "@/core/storage/storage";
import { can, getSession } from "@/core/auth";
import { unwrapList } from "@/shared/lib/unwrap";
import { DYNAMIC_PLACEHOLDERS as D, type Dashboard, type WidgetConfig } from "./model";

const log = createLogger("dashboard");

export function newDashboard(): Dashboard {
  const tab = { id: crypto.randomUUID(), name: "Dashboard 1", widgets: [] };
  return {
    id: crypto.randomUUID(),
    name: "My Dashboard",
    tabs: [tab],
    activeTabId: tab.id,
    refreshIntervalSec: 10,
  };
}
export function migrateDashboard(value: Dashboard): Dashboard {
  const original = structuredClone(value);
  const tabs = original.tabs?.length
    ? original.tabs
    : [{ id: crypto.randomUUID(), name: "Main", widgets: original.widgets ?? [] }];
  const first = tabs[0]!;
  const interval = Number(
    original.refreshIntervalSec ??
      (first as typeof first & { refreshIntervalSec?: number }).refreshIntervalSec ??
      10,
  );
  const { widgets: _widgets, ...rest } = original;
  return {
    ...rest,
    tabs,
    activeTabId: tabs.some((t) => t.id === original.activeTabId) ? original.activeTabId : first.id,
    refreshIntervalSec: Math.max(3, Math.min(20, Number.isFinite(interval) ? Math.round(interval) : 10)),
  };
}
const CACHE_KEY = "dashboard-layout";

/**
 * unified-agent DashboardService.loadDashboard: the server layout first; when the
 * server has none (404 "No dashboard layout saved") or cannot be reached, the
 * session copy, then a new default dashboard. Loading never blocks the page.
 */
export async function loadDashboard(userId: string): Promise<Dashboard> {
  const cached = () => {
    const stored = sessionStore.get<Dashboard>(`${CACHE_KEY}:${userId}`);
    return stored ? migrateDashboard(stored) : newDashboard();
  };
  try {
    const body = await cimCustomerApi.get<{ layout?: Dashboard }>(
      `/dashboard/layout/${encodeURIComponent(userId)}`,
    );
    if (!body?.layout) return cached();
    sessionStore.set(`${CACHE_KEY}:${userId}`, body.layout);
    return migrateDashboard(body.layout);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) log.warn("dashboard layout unavailable", error);
    return cached();
  }
}
export async function saveDashboard(userId: string, layout: Dashboard) {
  if (!can("agentSession") || getSession().user?.id !== userId)
    throw new Error("Dashboard session has changed.");
  sessionStore.set(`${CACHE_KEY}:${userId}`, layout);
  return cimCustomerApi.post("/dashboard/layout", { user_Id: userId, layout });
}
export interface NamedOption {
  id: string;
  name: string;
}
const namedOptions = (body: unknown, idKeys: string[], nameKeys: string[]) =>
  unwrapList<Record<string, unknown>>(body)
    .map((row) => ({
      id: String(idKeys.map((k) => row[k]).find((v) => v != null) ?? ""),
      name: String(nameKeys.map((k) => row[k]).find((v) => v != null) ?? ""),
    }))
    .filter((r) => r.id);
function currentTeam(selected?: string) {
  const user = getSession().user;
  return !selected || selected === D.CURRENT_TEAM
    ? (user?.supervisedTeams?.[0]?.teamId ?? user?.userTeam?.teamId ?? "")
    : selected;
}
async function queueOptions(teamId: string, signal?: AbortSignal) {
  return namedOptions(
    await reportingApi.get("/queue-stats/queues", { signal, searchParams: { teamId } }),
    ["queueId", "id", "_id"],
    ["queueName", "name"],
  );
}
async function botOptions(signal?: AbortSignal) {
  return namedOptions(
    await reportingApi.get("/bot-active-chats/detail", { signal }),
    ["botId", "id", "_id"],
    ["botName", "name"],
  );
}
export async function dashboardOptions(selectedTeam?: string, signal?: AbortSignal) {
  const user = getSession().user;
  const teams = [...(user?.supervisedTeams ?? []), ...(user?.userTeam ? [user.userTeam] : [])];
  const teamId = currentTeam(selectedTeam);
  const [queues, mrds, bots] = await Promise.allSettled([
    queueOptions(teamId, signal),
    reportingApi.get<unknown>("/mrd-stats", { signal, searchParams: { teamId } }),
    botOptions(signal),
  ]);
  return {
    teams: [...new Map(teams.map((t) => [t.teamId, { id: t.teamId, name: t.teamName }])).values()],
    queues: queues.status === "fulfilled" ? queues.value : [],
    mrds:
      mrds.status === "fulfilled"
        ? namedOptions(mrds.value, ["mrdId", "id", "_id"], ["mrdName", "name"])
        : [],
    bots: bots.status === "fulfilled" ? bots.value : [],
    warnings: [queues, mrds, bots].flatMap((result) =>
      result.status === "rejected" ? [String(result.reason?.message ?? result.reason)] : [],
    ),
  };
}
/** Exact ReportingApiService endpoint mapping from unified-agent develop. */
export async function fetchWidgetData(config: WidgetConfig, signal?: AbortSignal) {
  if (!can("agentSession")) throw new Error("Dashboard permission is unavailable.");
  const s = config.settings ?? {};
  const user = getSession().user;
  const teamId =
    !s.teamId || s.teamId === D.CURRENT_TEAM
      ? (user?.supervisedTeams?.[0]?.teamId ?? user?.userTeam?.teamId ?? "")
      : s.teamId;
  const agentId = !s.agentId || s.agentId === D.CURRENT_AGENT ? (user?.id ?? "") : s.agentId;
  let queueIds = s.queueIds ?? [];
  let botIds = s.botId ? [s.botId] : [];
  if (queueIds.includes(D.ALL_QUEUES) || botIds.includes(D.ALL_BOTS)) {
    if (config.category === "QUEUES" && queueIds.includes(D.ALL_QUEUES))
      queueIds = (await queueOptions(teamId, signal)).map((q) => q.id);
    if (config.category === "BOTS" && botIds.includes(D.ALL_BOTS))
      botIds = (await botOptions(signal)).map((b) => b.id);
  }
  // Reporting answers "no data yet" with 404 and an empty body ({"sla":0}, []): show it as empty, not as a failure.
  const noData = (error: unknown) => {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      error.data !== null &&
      typeof error.data === "object" &&
      !("detail" in error.data)
    )
      return error.data;
    throw error;
  };
  const get = (path: string, params?: Record<string, string>) =>
    reportingApi.get<unknown>(path, { signal, searchParams: params }).catch(noData);
  const post = (path: string, body: unknown, params?: Record<string, string>) =>
    reportingApi.post<unknown>(path, body, { signal, searchParams: params }).catch(noData);
  switch (config.metric) {
    case "SLA":
      return post("/historical-stats/queue/sla/average", { queueIds });
    case "AWT_AHT":
      return post("/historical-stats/queue/awt-and-aht/average", { queueIds });
    case "ABANDONED_RATIO":
      return post("/historical-stats/queue/abandoned-ratio-summary", { queueIds });
    case "ACTIVE_QUEUES":
      return post("/queue-stats", { queueNames: s.queueNames ?? [] }, { teamId });
    case "QUEUE_SUMMARY":
      return get("/queue-stats", { teamId });
    case "QUEUE_CHANNEL_SUMMARY":
      return post("/historical-stats/queue/queue-channel-summary", { queueIds }, { teamId });
    case "DAILY_CALLS_SUMMARY":
      return post("/historical-stats/queue/daily-calls-summary", { queueIds });
    case "AGENT_METRIC_SUMMARY":
      return get("/historical-stats/agent/agent-metric-summary", { agentId });
    case "AGENT_READY_NOT_READY":
      return get("/historical-stats/agent/ready-not-ready-summary", { agentId });
    case "AGENT_CONSULT_SUMMARY":
      return get("/historical-stats/agent/consult-summary", { agentId });
    case "AGENT_OCCUPANCY":
      return get("/historical-stats/agent/agent-occupancy-summary", { agentId });
    case "AGENT_HOURLY_HANDLED":
      return get("/historical-stats/agent/hourly-handled-summary", { agentId });
    case "AGENT_TEAM_SUMMARY":
      return post("/historical-stats/agent/agent-team-summary", {
        teamIds: s.teamIds?.map((id) => (id === D.CURRENT_TEAM ? teamId : id)) ?? [teamId],
      });
    case "MRD_STATS":
      return get("/mrd-stats", { teamId, mrdId: s.mrdId === D.ALL_MRDS ? "" : (s.mrdId ?? "") });
    case "BOT_ACTIVE_CHATS":
      return get("/bot-active-chats/summary", { botId: botIds[0] ?? "" });
    case "BOT_SUMMARY":
      return post("/historical-stats/bot/bot-summary", { botIds });
    default:
      throw new Error(`Unsupported dashboard metric: ${config.metric}`);
  }
}
