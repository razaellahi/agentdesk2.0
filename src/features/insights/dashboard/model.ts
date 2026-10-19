export const DYNAMIC_PLACEHOLDERS = {
  CURRENT_TEAM: "$CURRENT_TEAM$",
  CURRENT_AGENT: "$CURRENT_AGENT$",
  ALL_QUEUES: "$ALL_QUEUES$",
  ALL_MRDS: "$ALL_MRDS$",
  ALL_BOTS: "$ALL_BOTS$",
};

export const Category = {
  AGENTS: "AGENTS",
  CONVERSATIONS: "CONVERSATIONS",
  QUEUES: "QUEUES",
  TEAMS: "TEAMS",
  BOTS: "BOTS",
} as const;
export type Category = (typeof Category)[keyof typeof Category];

export const VisualizationType = {
  KPI: "KPI",
  PIE: "PIE",
  BAR: "BAR",
  LINE: "LINE",
  TABLE: "TABLE",
} as const;
export type VisualizationType = (typeof VisualizationType)[keyof typeof VisualizationType];

export interface MetricMetadata {
  id: string;
  name: string;
  category: Category;
  supportedVisuals: VisualizationType[];
  description?: string;
}

export interface Threshold {
  value: number;
  color: string;
  operator: ">" | ">=" | "<" | "<=" | "==";
}

export interface WidgetConfig {
  title: string;
  category: Category;
  metric: string;
  visualizationType: VisualizationType;
  settings?: {
    queueIds?: string[];
    queueNames?: string[];
    mrdId?: string;
    teamId?: string;
    teamIds?: string[];
    agentId?: string;
    botId?: string;
    refreshInterval?: number;
    primaryMetricField?: string;
    selectedMetricFields?: string[];
    thresholds?: Threshold[]; // Added thresholds support
  };
}

export interface Widget {
  id: string;
  config: WidgetConfig;
  cols: number;
  rows: number;
  x: number;
  y: number;
  width?: number; // in pixels
  height?: number; // in pixels
}

export interface DashboardTab {
  id: string;
  name: string;
  widgets: Widget[];
}

export interface Dashboard {
  id: string;
  name: string;
  tabs: DashboardTab[];
  activeTabId: string;
  refreshIntervalSec?: number;
  /** @deprecated kept for migration from old format only */
  widgets?: Widget[];
  categoryGroups?: CategoryGroup[];
}

export interface CategoryGroup {
  category: Category;
  x: number;
  y: number;
  width: number;
  height: number;
}
