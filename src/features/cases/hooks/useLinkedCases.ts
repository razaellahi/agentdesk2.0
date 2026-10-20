import { useQuery } from "@tanstack/react-query";
import { caseKeys, fetchCasesForInteraction } from "../api";

/**
 * Cases already linked to a conversation. Shared by the Cases tab and the tab strip's
 * attention marker, so both read one cached request.
 */
export function useLinkedCases(
  interactionId: string | null,
  customerProfileId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: caseKeys.interaction(interactionId ?? ""),
    queryFn: () => fetchCasesForInteraction(interactionId!, customerProfileId),
    enabled: enabled && Boolean(interactionId),
  });
}
