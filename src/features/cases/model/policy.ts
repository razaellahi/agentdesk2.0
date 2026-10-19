/** Tenant policy bounds (admin-settings.component.ts POLICY_LIMITS). */
export const POLICY_LIMITS = {
  reopenDays: { min: 1, max: 365, unit: "days" },
  auditRetentionDays: { min: 30, max: 730, unit: "days" },
  recentCasesWindowHours: { min: 1, max: 720, unit: "hours" },
  dashboardRefreshSeconds: { min: 15, max: 300, unit: "seconds" },
} as const;

export type PolicyField = keyof typeof POLICY_LIMITS;
export const POLICY_FIELDS = Object.keys(POLICY_LIMITS) as PolicyField[];

export function policyFieldValid(field: PolicyField, value: number): boolean {
  const { min, max } = POLICY_LIMITS[field];
  return Number.isFinite(value) && value >= min && value <= max;
}
