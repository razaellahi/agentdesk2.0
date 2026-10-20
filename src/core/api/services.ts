import { createServiceClient } from "./apiClient";

/** One client per EF backend service; base URLs come from config.json. */
export const agentManagerApi = createServiceClient("GAT_URL");
export const fileEngineApi = createServiceClient("FILE_SERVER_URL");
export const ccmApi = createServiceClient("CCM_URL");
export const cimCustomerApi = createServiceClient("CIM_CUSTOMER_URL");
export const conversationManagerApi = createServiceClient("CONVERSATION_MANAGER_URL");
export const routingEngineApi = createServiceClient("ROUTING_ENGINE_URL");
export const reportingApi = createServiceClient("CIM_REPORTING_URL");
export const unifiedAdminApi = createServiceClient("UNIFIED_ADMIN_URL");
export const announcementApi = createServiceClient("TEAM_ANNOUNCEMENT_URL");
export const secureLinkApi = createServiceClient("SECURE_LINK_URL");
export const cxTenantApi = createServiceClient("CX_TENANT_URL");
export const qmApi = createServiceClient("QM_URL");
export const llmApi = createServiceClient("LLM_CONNECTOR_URL");
export const vrsApi = createServiceClient("VRS_URL");
export const caseApi = createServiceClient("CASE_MANAGEMENT_API_URL");
