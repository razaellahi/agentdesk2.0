import { getConfig } from "./configStore";

/** Parses "internal:external,internal2:external2" (FILE_ENGINE_FQDN_MAPPING). */
export function parseFqdnMapping(mapping: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of mapping.split(",")) {
    const trimmed = pair.trim();
    const separator = trimmed.indexOf(":");
    if (separator <= 0 || separator === trimmed.length - 1) continue;
    const internal = trimmed.slice(0, separator).trim();
    const external = trimmed.slice(separator + 1).trim();
    if (internal && external) map.set(internal, external);
  }
  return map;
}

/**
 * Base URL for download links published on outgoing messages. Upload and display
 * use FILE_SERVER_URL; customers may need the external FQDN (unified-agent
 * appConfigService.getFileDownloadBaseUrl).
 */
export function getFileDownloadBaseUrl(hostname = globalThis.location.hostname): string {
  const { FILE_SERVER_URL, ENABLE_FILE_ENGINE_EXTERNAL_FQDN, FILE_ENGINE_FQDN_MAPPING } = getConfig();
  if (!ENABLE_FILE_ENGINE_EXTERNAL_FQDN) return FILE_SERVER_URL;
  const external = parseFqdnMapping(FILE_ENGINE_FQDN_MAPPING).get(hostname);
  return external ? FILE_SERVER_URL.replace(/^https?:\/\/[^/]*/, `https://${external}`) : FILE_SERVER_URL;
}
