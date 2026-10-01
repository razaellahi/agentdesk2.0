import type { RuntimeConfig } from "./runtimeConfig.schema";

/**
 * The validated runtime config. Set exactly once during bootstrap, before any
 * React tree or API client is created, then read synchronously everywhere.
 */
let current: RuntimeConfig | null = null;

export function setConfig(config: RuntimeConfig): void {
  current = Object.freeze({ ...config });
}

export function getConfig(): RuntimeConfig {
  if (!current) throw new Error("Runtime config accessed before bootstrap finished loading it");
  return current;
}

export function hasConfig(): boolean {
  return current !== null;
}

/** Test helper: reset between tests. */
export function resetConfigForTests(): void {
  current = null;
}
