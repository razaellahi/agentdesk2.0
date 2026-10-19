export const SummaryPage = () => import("./GrafanaPage").then((m) => ({ default: m.SummaryPage }));
export const AgentPerformancePage = () =>
  import("./GrafanaPage").then((m) => ({ default: m.AgentPerformancePage }));
export const TeamStatsPage = () => import("./GrafanaPage").then((m) => ({ default: m.TeamStatsPage }));
export const TeamDetailPage = () => import("./GrafanaPage").then((m) => ({ default: m.TeamDetailPage }));
export const RealtimePage = () => import("./RealtimePage");
