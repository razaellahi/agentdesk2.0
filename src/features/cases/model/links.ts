import { getConfig } from "@/config";

/** Origin of the tenant FQDN that serves Case Management (and the customer widget beside it). */
function caseOrigin(): string {
  const base = getConfig().CASE_MANAGEMENT_API_URL;
  try {
    return new URL(base ?? "", globalThis.location.origin).origin;
  } catch {
    return globalThis.location.origin;
  }
}

/**
 * The desk's own conversation view of a customer, scrolled to the moment a case was raised from it.
 * The workspace reads these parameters (useOpenFromLink), so cases never import the workspace.
 */
export function conversationAtUrl(customerProfileId: string, customerName: string, at: string): string {
  const params = new URLSearchParams({ customer: customerProfileId, name: customerName, at });
  return `/conversations?${params.toString()}`;
}

/** Chat transcript deep link on the tenant FQDN (case-console conversation-url.ts). */
export function transcriptUrl(interactionId: string): string {
  return `${caseOrigin()}/customer-widget/#/chat-transcript?conversationId=${encodeURIComponent(interactionId)}`;
}
