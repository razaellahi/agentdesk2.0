import type { RuntimeConfig } from "@/config";
import { parseConfig } from "@/config/loadConfig";

export const baseRawConfig = {
  GAT_URL: "https://efcx.expertflow.com/agent-manager",
  SOCKET_URL: "https://efcx.expertflow.com/agent-manager",
  FILE_SERVER_URL: "https://efcx.expertflow.com/file-engine/1",
  CCM_URL: "https://efcx.expertflow.com/ccm",
  CIM_CUSTOMER_URL: "https://efcx.expertflow.com/cim-customer",
  CONVERSATION_MANAGER_URL: "https://efcx.expertflow.com/conversation-manager",
  ROUTING_ENGINE_URL: "https://efcx.expertflow.com/routing-engine",
  CIM_REPORTING_URL: "https://efcx.expertflow.com/realtime-reports",
  UNIFIED_ADMIN_URL: "https://efcx.expertflow.com/unified-admin",
};

export function makeConfig(overrides: Record<string, unknown> = {}): RuntimeConfig {
  return parseConfig({ ...baseRawConfig, ...overrides });
}
