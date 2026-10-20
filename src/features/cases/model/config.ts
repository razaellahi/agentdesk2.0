import { getConfig, hasConfig } from "@/config";

/** The Cases module and conversation tab exist unless `feature_caseManagement` is switched off. */
export function caseManagementConfigured(): boolean {
  return hasConfig() && getConfig().feature_caseManagement;
}
