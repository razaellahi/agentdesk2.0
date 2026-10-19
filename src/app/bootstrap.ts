import { getConfig, loadConfig, setConfig } from "@/config";
import { installGtm } from "@/core/analytics/gtm";
import { loadDeskSettings, getDeskSettings } from "@/core/agent-settings";
import {
  getSession,
  installApiAuth,
  loginWithExternalService,
  loginWithFinesse,
  onAfterLogin,
  readFcmKey,
  readSsoRequest,
  restoreSession,
  stripSsoParams,
  type SsoRequest,
} from "@/core/auth";
import { postCrmEvent, setCrmEventsEnabled } from "@/core/crm-bridge";
import { initI18n } from "@/core/i18n";
import { setSsoFailure } from "@/features/auth";
import { createLogger, setLogLevel } from "@/core/logging/logger";
import { localStore, setStorageTenant } from "@/core/storage/storage";
import { loadTenantBranding, resolveTenant, useTenantStore } from "@/core/tenant";
import { initTheme } from "@/core/theme";

const log = createLogger("bootstrap");

export interface BootContext {
  /** SSO login attempted from URL parameters (Finesse gadget / CRM). */
  sso: SsoRequest;
  ssoError: unknown;
  /** Extension handed over by the Finesse gadget. */
  finesseExtension: string | null;
  fcmKey: string | null;
}

/**
 * Startup sequence (mirrors unified-agent APP_INITIALIZER, plus tenancy):
 *  1. config.json  2. tenant  3. theme  4. branding + desk settings + i18n (parallel)
 *  5. SSO from URL params, otherwise restore the session from the refresh token.
 * Anything that throws here renders the "Unable to start Agent Desk" screen.
 */
export async function bootstrap(): Promise<BootContext> {
  const config = await loadConfig();
  setConfig(config);
  setLogLevel(config.LOG_LEVEL);
  installGtm(config.GTM_ID);

  const tenantId = resolveTenant(config);
  useTenantStore.getState().setTenant(tenantId);
  setStorageTenant(tenantId);
  initTheme(config.DEFAULT_THEME);
  installApiAuth();

  const [, deskSettings] = await Promise.all([
    loadTenantBranding(tenantId),
    loadDeskSettings(),
    initI18n({ defaultLanguage: config.DEFAULT_LANGUAGE, preferred: localStore.getString("language") }),
  ]);
  log.debug("Desk settings loaded", { cisco: deskSettings.cisco, cxVoice: deskSettings.cxVoice });

  // CRM AGENT_LOGIN on every fresh login (password, 2FA, Finesse, CRM SSO) but not
  // on a reload restore, as unified-agent IsLoggedInService.loginFlow.
  setCrmEventsEnabled(deskSettings.crmEvents);
  onAfterLogin(() => {
    const user = getSession().user;
    if (user) postCrmEvent({ keycloak_User: user });
  });

  const fcmKey = readFcmKey();
  const sso = readSsoRequest();
  let ssoError: unknown = null;
  let finesseExtension: string | null = null;

  if (sso) {
    stripSsoParams();
    try {
      if (sso.kind === "finesse") {
        finesseExtension = sso.extension;
        const cisco = getDeskSettings().ciscoSettings;
        try {
          await loginWithFinesse({ ...sso.payload, finesseUrl: cisco.finesseURLForAgent ?? "" });
        } catch (error) {
          // Finesse HA: retry once against the secondary Finesse node.
          if (!cisco.isFinesseHaEnabled || !cisco.secondaryFinesseUrl) throw error;
          log.warn("Primary Finesse login failed, retrying on secondary node");
          await loginWithFinesse({ ...sso.payload, finesseUrl: cisco.secondaryFinesseUrl });
        }
      } else {
        await loginWithExternalService(sso.payload);
      }
    } catch (error) {
      log.error("SSO login failed", error);
      ssoError = error;
      setSsoFailure(error);
    }
  } else {
    await restoreSession();
  }

  log.info(`Agent Desk ready (tenant ${tenantId}, env ${getConfig().ENV})`);
  return { sso, ssoError, finesseExtension, fcmKey };
}
