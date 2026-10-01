import { getConfig } from "@/config";
import { createLogger } from "@/core/logging/logger";
import { sessionStore } from "@/core/storage/storage";
import { useTenantStore } from "./tenantStore";

const log = createLogger("tenant");
const LOGO_KEY = "tenantLogo";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Loads the tenant logo from the file engine (unauthenticated, same as today) and
 * caches it per tenant for the session. Failure is non-fatal: the EF logo is used.
 */
export async function loadTenantBranding(tenantId: string): Promise<void> {
  const cached = sessionStore.getString(LOGO_KEY);
  if (cached) {
    useTenantStore.getState().setBranding({ logoUrl: cached });
    return;
  }
  try {
    const response = await fetch(`${getConfig().FILE_SERVER_URL}/api/getTenantLogo`, {
      headers: { tenantid: tenantId },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.size || !blob.type.startsWith("image/")) return;
    const dataUrl = await blobToDataUrl(blob);
    sessionStore.setString(LOGO_KEY, dataUrl);
    useTenantStore.getState().setBranding({ logoUrl: dataUrl });
  } catch (error) {
    log.debug("Tenant logo unavailable, using default", error);
  }
}
