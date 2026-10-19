import { Category, VisualizationType, type MetricMetadata } from "./model";
export const METRIC_METADATA: Record<Category, MetricMetadata[]> = {
  [Category.QUEUES]: [
    {
      id: "SLA",
      name: "Service Level (SLA)",
      category: Category.QUEUES,
      supportedVisuals: [VisualizationType.KPI, VisualizationType.BAR, VisualizationType.LINE],
    },
    {
      id: "AWT_AHT",
      name: "Wait & Handle Time",
      category: Category.QUEUES,
      supportedVisuals: [VisualizationType.KPI, VisualizationType.BAR, VisualizationType.LINE],
    },
    {
      id: "ABANDONED_RATIO",
      name: "Abandoned Ratio",
      category: Category.QUEUES,
      supportedVisuals: [VisualizationType.KPI, VisualizationType.BAR, VisualizationType.LINE],
    },
    {
      id: "QUEUE_SUMMARY",
      name: "Queue Stats Summary",
      category: Category.QUEUES,
      supportedVisuals: [VisualizationType.TABLE],
    },
    {
      id: "QUEUE_CHANNEL_SUMMARY",
      name: "Queue performance by channel",
      category: Category.QUEUES,
      supportedVisuals: [VisualizationType.TABLE, VisualizationType.BAR, VisualizationType.PIE],
    },
    {
      id: "DAILY_CALLS_SUMMARY",
      name: "Daily Calls Summary",
      category: Category.QUEUES,
      supportedVisuals: [VisualizationType.LINE, VisualizationType.BAR, VisualizationType.TABLE],
    },
  ],
  [Category.AGENTS]: [
    {
      id: "AGENT_METRIC_SUMMARY",
      name: "Agent Performance Statistics",
      category: Category.AGENTS,
      supportedVisuals: [VisualizationType.KPI, VisualizationType.BAR, VisualizationType.TABLE],
    },
    {
      id: "AGENT_READY_NOT_READY",
      name: "State Time",
      category: Category.AGENTS,
      supportedVisuals: [VisualizationType.PIE, VisualizationType.BAR, VisualizationType.KPI],
    },
    {
      id: "AGENT_CONSULT_SUMMARY",
      name: "Consulted Conversations",
      category: Category.AGENTS,
      supportedVisuals: [VisualizationType.KPI, VisualizationType.BAR, VisualizationType.TABLE],
    },
    {
      id: "AGENT_OCCUPANCY",
      name: "Occupancy %",
      category: Category.AGENTS,
      supportedVisuals: [VisualizationType.KPI, VisualizationType.BAR],
    },
    {
      id: "AGENT_HOURLY_HANDLED",
      name: "Hourly Handled Summary",
      category: Category.AGENTS,
      supportedVisuals: [VisualizationType.LINE, VisualizationType.BAR, VisualizationType.TABLE],
    },
  ],
  [Category.CONVERSATIONS]: [
    {
      id: "MRD_STATS",
      name: "Agent Availability per Channel",
      category: Category.CONVERSATIONS,
      supportedVisuals: [VisualizationType.TABLE, VisualizationType.BAR, VisualizationType.PIE],
    },
  ],
  [Category.TEAMS]: [
    {
      id: "AGENT_TEAM_SUMMARY",
      name: "Agent Team Performance",
      category: Category.TEAMS,
      supportedVisuals: [VisualizationType.TABLE, VisualizationType.BAR],
    },
  ],
  [Category.BOTS]: [
    {
      id: "BOT_ACTIVE_CHATS",
      name: "Active with Bot(s)",
      category: Category.BOTS,
      supportedVisuals: [VisualizationType.KPI, VisualizationType.TABLE],
    },
    {
      id: "BOT_SUMMARY",
      name: "Bot Performance Statistics",
      category: Category.BOTS,
      supportedVisuals: [VisualizationType.KPI, VisualizationType.BAR, VisualizationType.TABLE],
    },
  ],
};
