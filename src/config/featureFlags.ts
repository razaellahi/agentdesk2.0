import { getConfig } from "./configStore";
import type { RuntimeConfig } from "./runtimeConfig.schema";

type FlagKey = Extract<keyof RuntimeConfig, `feature_${string}`>;

/** Logical feature names mapped to their config.json keys (legacy keys kept). */
export const FEATURES = {
  customisedDashboard: "feature_CIM_32834_customisedDashboard",
  quickReplies: "feature_CIM_33144_quick_replies",
  multiPaneBoard: "feature_multiPaneBoard",
  aiWidgetGenerator: "feature_aiWidgetGenerator",
  recordings: "feature_recordings",
} as const satisfies Record<string, FlagKey>;

export type Feature = keyof typeof FEATURES;

export function isFeatureEnabled(feature: Feature): boolean {
  return getConfig()[FEATURES[feature]];
}

/** Config is immutable after bootstrap, so a plain function is enough for components too. */
export const useFeature = isFeatureEnabled;
