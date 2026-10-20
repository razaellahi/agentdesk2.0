import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { caseKeys, fetchCaseAuditLog, type Case } from "../api";
import { caseMilestones, isVisibleHistoryEntry } from "../model/activityFormat";

/**
 * Readable history of a case. Refetches whenever the case changes (its updatedAt is in
 * the key). When the audit log is refused — the backend limits it to the case's team,
 * while the conversation tab may show any case of the customer — the milestones the
 * case itself carries are shown instead, and `limited` says so.
 */
export function useCaseHistory(record: Case | null | undefined) {
  const query = useQuery({
    queryKey: [...caseKeys.audit(record?.id ?? ""), record?.updatedAt],
    queryFn: () => fetchCaseAuditLog(record!.id),
    enabled: Boolean(record),
    retry: false,
    placeholderData: keepPreviousData,
  });
  const limited = query.isError;
  const entries = limited && record ? caseMilestones(record) : (query.data ?? []);
  return {
    entries: entries.filter(isVisibleHistoryEntry),
    loading: Boolean(record) && query.isPending,
    limited,
  };
}
