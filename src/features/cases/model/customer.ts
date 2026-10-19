import type { CimCustomerDoc, CimLabel } from "../api/types";

/** Customer picked on Create case (case-console models/cim-customer.ts). */
export interface SelectedCustomer {
  profileId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  labelNames: string[];
  /** Label name used for SLA threshold lookup (matches the admin matrix). */
  slaTier: string | null;
  openCases: number;
}

/** CIM often returns channel attributes as string arrays (phoneNumber: ["031…"]). */
export function normalizeCimScalar(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const s = String(item).trim();
      if (s) return s;
    }
    return null;
  }
  const s = String(value).trim();
  return s || null;
}

export function cimCustomerDisplayName(doc: CimCustomerDoc): string {
  const combined =
    `${normalizeCimScalar(doc.firstName) ?? ""} ${normalizeCimScalar(doc.lastName) ?? ""}`.trim();
  return combined || normalizeCimScalar(doc.email) || normalizeCimScalar(doc.phoneNumber) || doc._id;
}

/** First customer label configured as an SLA tier, else the first label. */
export function resolveSlaTierFromLabels(
  labelIds: string[] | null | undefined,
  catalog: CimLabel[],
  configuredTierNames: string[],
): string | null {
  if (!labelIds?.length || !catalog.length) return null;
  const namesById = new Map(catalog.map((l) => [l._id, l.name.trim()]));
  const customerNames = labelIds
    .map((id) => namesById.get(id))
    .filter((n): n is string => Boolean(n?.length));
  const configured = new Set(configuredTierNames.map((t) => t.trim().toLowerCase()).filter(Boolean));
  return customerNames.find((name) => configured.has(name.toLowerCase())) ?? customerNames[0] ?? null;
}

export function labelNamesFor(labelIds: string[] | null | undefined, catalog: CimLabel[]): string[] {
  if (!labelIds?.length) return [];
  const byId = new Map(catalog.map((l) => [l._id, l.name]));
  return labelIds.map((id) => byId.get(id)).filter((n): n is string => Boolean(n?.trim()));
}

export function toSelectedCustomer(
  doc: CimCustomerDoc,
  catalog: CimLabel[],
  tierNames: string[],
  openCases: number,
): SelectedCustomer {
  return {
    profileId: doc._id,
    displayName: cimCustomerDisplayName(doc),
    email: normalizeCimScalar(doc.email),
    phone: normalizeCimScalar(doc.phoneNumber),
    labelNames: labelNamesFor(doc.labels, catalog),
    slaTier: resolveSlaTierFromLabels(doc.labels, catalog, tierNames),
    openCases,
  };
}

// --- Standalone interaction references on Create case (case-interaction.util.ts)

export function isInteractionUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) return true;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    // A bare word parses as a host too; require a dot so free text stays text.
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export function interactionHref(value: string): string {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Omni-channel interaction id for API idempotency: exactly one non-URL reference. */
export function pickInteractionIdForApi(values: string[]): string | null {
  const nonUrls = values
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((v) => !isInteractionUrl(v));
  return nonUrls.length === 1 && nonUrls[0]!.length <= 255 ? nonUrls[0]! : null;
}
