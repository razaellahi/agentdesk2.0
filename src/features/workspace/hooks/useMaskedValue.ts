import { useScope } from "@/core/auth";
import { maskPii, piiAttribute } from "../model/pii";
import { useSchemaStore } from "../store/schemaStore";

/**
 * Masks a customer attribute for display (unified-agent maskPIIAttribute pipe).
 * `permission` is the scope that shows the value in full on this screen (manage,
 * manage_in_conversation). `preferViewPii` mirrors the legacy screens that check
 * `customer:view_pii` first (chat list, request notifications, call controls).
 */
export function useMaskedValue(
  value: unknown,
  key: string,
  permission = "view_pii",
  { preferViewPii = false }: { preferViewPii?: boolean } = {},
): string {
  const contextual = useScope("customer", permission);
  const viewPii = useScope("customer", "view_pii");
  const full = contextual || (preferViewPii && viewPii);
  const masked = useScope("customer", "masked_pii");
  const attr = useSchemaStore((s) => s.schema.find((a) => a.key.toLowerCase() === key.toLowerCase()) ?? null);
  return maskPii(value, piiAttribute(key, attr), { full, masked });
}
