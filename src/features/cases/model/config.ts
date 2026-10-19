import { getConfig, hasConfig } from "@/config";

/** The Cases module and conversation tab exist only when config.json names the case API. */
export function caseManagementConfigured(): boolean {
  return hasConfig() && Boolean(getConfig().CASE_API_URL);
}
