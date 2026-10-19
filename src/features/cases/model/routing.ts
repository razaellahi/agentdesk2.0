import type { RoutingGroup } from "../api/types";
import { groupSlug } from "./format";

/** Map a stored routing key (slug, Keycloak id or case-routing-*) to a group <option> value. */
export function resolveGroupOptionValue(stored: string | null | undefined, groups: RoutingGroup[]): string {
  const key = (stored ?? "").trim();
  if (!key) return "";
  const normalized = key.replace(/^\//, "").trim().toLowerCase();
  for (const g of groups) if (groupSlug(g.name) === normalized || g.id === key) return groupSlug(g.name);
  const prefix = "case-routing-";
  const lookup = new Set([
    normalized,
    normalized.startsWith(prefix) ? normalized.slice(prefix.length) : `${prefix}${normalized}`,
  ]);
  for (const g of groups) {
    const name = g.name.replace(/^\//, "").trim().toLowerCase();
    if (lookup.has(name) || lookup.has(groupSlug(g.name))) return groupSlug(g.name);
  }
  return key;
}
