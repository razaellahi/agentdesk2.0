import { getConfig } from "@/config";

/** Origin of the tenant FQDN that serves Case Management (and the customer widget beside it). */
function caseOrigin(): string {
  const base = getConfig().CASE_API_URL;
  try {
    return new URL(base ?? "", globalThis.location.origin).origin;
  } catch {
    return globalThis.location.origin;
  }
}

/** Chat transcript deep link on the tenant FQDN (case-console conversation-url.ts). */
export function transcriptUrl(interactionId: string): string {
  return `${caseOrigin()}/customer-widget/#/chat-transcript?conversationId=${encodeURIComponent(interactionId)}`;
}
