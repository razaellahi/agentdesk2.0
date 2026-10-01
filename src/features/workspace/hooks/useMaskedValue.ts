import { useScope } from "@/core/auth";
import { maskPii } from "../model/pii";
import { useSchemaStore } from "../store/schemaStore";

/**
 * Masks a customer attribute for display. `permission` is the scope that
 * grants full visibility in this context (view_pii, manage, manage_in_conversation).
 */
export function useMaskedValue(value: unknown, key: string, permission = "view_pii"): string {
  const full = useScope("customer", permission);
  const masked = useScope("customer", "masked_pii");
  const attr = useSchemaStore((s) => s.schema.find((a) => a.key.toLowerCase() === key.toLowerCase()) ?? null);
  return maskPii(value, attr, { full, masked });
}
