import { z } from "zod";

/**
 * Schema for public/config.json (rendered from docker/config.json.template).
 *
 * Key names match unified-agent's config.json so existing deployment values carry
 * over unchanged. envsubst renders every value as a string, so booleans and numbers
 * are coerced here and empty strings fall back to defaults.
 */

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const bool = (fallback: boolean) =>
  z.preprocess((value) => {
    const v = emptyToUndefined(value);
    if (v === undefined || v === null) return fallback;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v.trim().toLowerCase() === "true";
    return Boolean(v);
  }, z.boolean());

const num = (fallback: number) =>
  z.preprocess((value) => emptyToUndefined(value) ?? fallback, z.coerce.number().finite());

const str = (fallback = "") => z.preprocess((value) => emptyToUndefined(value) ?? fallback, z.string());

const serviceUrl = z
  .string({ error: "is required" })
  .trim()
  .min(1, { error: "is required" })
  .refine((value) => /^(https?|wss?):\/\//.test(value) || value.startsWith("/"), {
    error: "must be an absolute URL or a path starting with /",
  });

const optionalUrl = z.preprocess(emptyToUndefined, serviceUrl.optional());

export const runtimeConfigSchema = z.object({
  // --- Backend services
  GAT_URL: serviceUrl,
  SOCKET_URL: serviceUrl,
  FILE_SERVER_URL: serviceUrl,
  CCM_URL: serviceUrl,
  CIM_CUSTOMER_URL: serviceUrl,
  CONVERSATION_MANAGER_URL: serviceUrl,
  ROUTING_ENGINE_URL: serviceUrl,
  CIM_REPORTING_URL: serviceUrl,
  UNIFIED_ADMIN_URL: serviceUrl,
  TEAM_ANNOUNCEMENT_URL: optionalUrl,
  SECURE_LINK_URL: optionalUrl,
  CX_TENANT_URL: optionalUrl,
  QM_URL: optionalUrl,
  LLM_CONNECTOR_URL: optionalUrl,
  VRS_URL: optionalUrl,
  /** Case Management API; unified-agent key and default (`/case-api` on the page origin). */
  CASE_MANAGEMENT_API_URL: z.preprocess((v) => emptyToUndefined(v) ?? "/case-api", serviceUrl),

  // --- Voice
  SIP_SOCKET_URL: str(),
  SIP_URI: str(),
  /** Static extension password the CX Voice wrapper registers with (UA EXT_STATIC). */
  EXT_STATIC: str(),
  ENABLE_SIP_LOGS: bool(false),
  SIP_MONITORING_DN: str(),
  ROOT_DOMAIN: str(),

  // --- Behaviour
  SOCKET_TIMEOUT: num(20000),
  ENV: str("prod"),
  getQueuesDelay: z.preprocess((v) => {
    const n = Number(emptyToUndefined(v));
    return Number.isFinite(n) && n > 0 ? n : 15;
  }, z.number()),
  DASHBOARD_REFRESH_TIME: num(10000),
  isCallingComplianceEnabled: bool(false),
  ENABLE_FILE_ENGINE_EXTERNAL_FQDN: bool(false),
  FILE_ENGINE_FQDN_MAPPING: str(),

  // --- Recordings (VRS)
  DEPLOYMENT_PROFILE: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toUpperCase() || undefined : v) ?? "EFCX",
    z.enum(["CISCO", "EFCX"]),
  ),
  VRS_TENANT_HEADER: str("VRS"),

  // --- Multi-tenancy
  TENANT_MODE: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() || undefined : v) ?? "subdomain",
    z.enum(["subdomain", "fixed", "header"]),
  ),
  TENANT_ID: str(),
  DEFAULT_TENANT: str("expertflow"),

  // --- i18n & theme
  DEFAULT_LANGUAGE: str("en"),
  DEFAULT_THEME: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() || undefined : v) ?? "system",
    z.enum(["light", "dark", "system"]),
  ),

  // --- App
  BASE_PATH: str("/agent-desk/"),
  REWRITE_URL_HOST_TO_ORIGIN: bool(true),
  GOOGLE_MAPS_API_KEY: str(),
  FIREBASE_CONFIG: str(),
  GTM_ID: str(),
  ERROR_REPORTING_DSN: str(),
  LOG_LEVEL: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() || undefined : v) ?? "warn",
    z.enum(["debug", "info", "warn", "error", "silent"]),
  ),
  MAX_BOARD_PANES: z.preprocess((v) => {
    const n = Number(emptyToUndefined(v));
    return Number.isInteger(n) && n >= 1 && n <= 4 ? n : 3;
  }, z.number()),

  // --- Feature flags
  feature_CIM_32834_customisedDashboard: bool(false),
  feature_CIM_33144_quick_replies: bool(false),
  feature_multiPaneBoard: bool(true),
  // On by default like unified-agent; the model downloads only when an agent generates.
  feature_aiWidgetGenerator: bool(true),
  feature_recordings: bool(true),
  // Cases module and conversation Cases tab (on by default, like unified-agent's Cases panel).
  feature_caseManagement: bool(true),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

/** Service URL keys whose host is rewritten to the page origin (unified-agent's configsToOverride + VRS). */
export const HOST_REWRITE_KEYS = [
  "GAT_URL",
  "SOCKET_URL",
  "FILE_SERVER_URL",
  "CX_TENANT_URL",
  "CCM_URL",
  "CIM_CUSTOMER_URL",
  "CONVERSATION_MANAGER_URL",
  "SECURE_LINK_URL",
  "TEAM_ANNOUNCEMENT_URL",
  "UNIFIED_ADMIN_URL",
  "CIM_REPORTING_URL",
  "ROUTING_ENGINE_URL",
  "QM_URL",
  "LLM_CONNECTOR_URL",
  "VRS_URL",
  "CASE_MANAGEMENT_API_URL",
] as const satisfies readonly (keyof RuntimeConfig)[];
