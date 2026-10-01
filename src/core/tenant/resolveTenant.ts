import type { RuntimeConfig } from "@/config/runtimeConfig.schema";

type TenantConfig = Pick<RuntimeConfig, "TENANT_MODE" | "TENANT_ID" | "ROOT_DOMAIN" | "DEFAULT_TENANT">;

/**
 * Determines the tenant before login. Backends resolve the tenant the same way
 * (host subdomain, or a `tenantid` header), so the front end must agree with them.
 *
 * - fixed:     TENANT_ID from config (single-tenant deployments)
 * - subdomain: hostname minus ROOT_DOMAIN, e.g. acme.expertflow.com -> "acme"
 * - header:    `tenant` query param supplied by an embedding host (Finesse / CRM)
 *
 * Falls back to DEFAULT_TENANT. After login, keycloak_User.tenant is authoritative.
 */
export function resolveTenant(
  config: TenantConfig,
  location: Pick<Location, "hostname" | "search"> = globalThis.location,
): string {
  const fallback = config.DEFAULT_TENANT || "expertflow";

  if (config.TENANT_MODE === "fixed") return config.TENANT_ID.trim() || fallback;

  if (config.TENANT_MODE === "header") {
    const fromQuery = new URLSearchParams(location.search).get("tenant")?.trim();
    return fromQuery || config.TENANT_ID.trim() || fallback;
  }

  return tenantFromHostname(location.hostname, config.ROOT_DOMAIN) || fallback;
}

export function tenantFromHostname(hostname: string, rootDomain: string): string | null {
  const host = hostname.toLowerCase();
  if (!host || host === "localhost" || /^[\d.]+$/.test(host) || host.includes(":")) return null;

  const root = rootDomain.trim().toLowerCase().replace(/^\./, "");
  if (root) {
    if (host === root) return null;
    if (host.endsWith(`.${root}`)) {
      const sub = host.slice(0, -(root.length + 1));
      // Only the left-most label identifies the tenant (acme.eu.expertflow.com -> acme).
      return sub.split(".")[0] || null;
    }
    return null;
  }
  // No ROOT_DOMAIN: treat the first label of a 3+ label host as the tenant.
  const labels = host.split(".");
  return labels.length >= 3 ? (labels[0] ?? null) : null;
}

/** Tenant id carried on the logged-in user (keycloak_User.tenant), if any. */
export function tenantOfUser(user: {
  tenant?: { id?: string; name?: string | null } | string | null;
}): string | null {
  const t = user.tenant;
  if (!t) return null;
  if (typeof t === "string") return t;
  return t.name || t.id || null;
}
