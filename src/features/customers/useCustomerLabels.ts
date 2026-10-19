import { useQuery } from "@tanstack/react-query";
import { usePermission } from "@/core/auth";
import { hydrateLabels, listLabels, type Label } from "./api";

/** A customer's labels with names and colours, shown only to agents who may see labels. */
export function useCustomerLabels(value: unknown): Label[] {
  const canSee = usePermission("customerLabels");
  const labels = useQuery({ queryKey: ["labels"], queryFn: listLabels, enabled: canSee, staleTime: 60_000 });
  return canSee ? hydrateLabels(value, labels.data ?? []) : [];
}
