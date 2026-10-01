import { HOST_REWRITE_KEYS, runtimeConfigSchema, type RuntimeConfig } from "./runtimeConfig.schema";

export class ConfigError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = "ConfigError";
    this.issues = issues;
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", ""]);

/**
 * Rewrites the host of every service URL to the page's FQDN, so a single config
 * serves every tenant host (same behaviour as unified-agent's
 * rewriteRemoteUrlsForCurrentHost). Skipped for localhost so dev can point at a
 * remote environment, and for relative paths which already follow the origin.
 */
export function rewriteHostsToOrigin(
  raw: Record<string, unknown>,
  location: Pick<Location, "hostname" | "protocol"> = globalThis.location,
): Record<string, unknown> {
  if (LOCAL_HOSTS.has(location.hostname)) return raw;
  const next = { ...raw };
  for (const key of HOST_REWRITE_KEYS) {
    const value = next[key];
    if (typeof value === "string" && /^https?:\/\//.test(value)) {
      next[key] = value.replace(/^https?:\/\/[^/]*/, `https://${location.hostname}`);
    }
  }
  return next;
}

export function parseConfig(raw: unknown): RuntimeConfig {
  const result = runtimeConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"} ${issue.message}`);
    throw new ConfigError("config.json is invalid", issues);
  }
  return result.data;
}

function stripTrailingSlashes(config: RuntimeConfig): RuntimeConfig {
  const next = { ...config } as Record<string, unknown>;
  for (const key of HOST_REWRITE_KEYS) {
    const value = next[key];
    if (typeof value === "string") next[key] = value.replace(/\/+$/, "");
  }
  return next as RuntimeConfig;
}

/** Fetches, rewrites and validates config.json. Never cached: values change per deployment. */
export async function loadConfig(url = `${import.meta.env.BASE_URL}config.json`): Promise<RuntimeConfig> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    throw new ConfigError(`config.json could not be fetched: ${(error as Error).message}`);
  }
  if (!response.ok) throw new ConfigError(`config.json could not be fetched (HTTP ${response.status})`);

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ConfigError("config.json is not valid JSON");
  }
  if (!raw || typeof raw !== "object") throw new ConfigError("config.json must be a JSON object");

  const parsed = parseConfig(rewriteHostsToOrigin(raw as Record<string, unknown>));
  // Re-apply after parsing: REWRITE_URL_HOST_TO_ORIGIN=false means keep URLs verbatim.
  const config = parsed.REWRITE_URL_HOST_TO_ORIGIN ? parsed : parseConfig(raw);
  return stripTrailingSlashes(config);
}
