import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { caseKeys, fetchDistributionPolicy, fetchMe } from "../api";
import { caseAbilities } from "../model/workbench";

/** The case backend's view of the agent (userId, case-* roles, Keycloak groups). */
export function useCaseMe() {
  return useQuery({ queryKey: caseKeys.me, queryFn: fetchMe, staleTime: Number.POSITIVE_INFINITY });
}

export function useCaseAbilities() {
  const me = useCaseMe();
  const userId = me.data?.userId ?? null;
  const abilities = useMemo(() => caseAbilities(me.data?.roles ?? [], userId), [me.data?.roles, userId]);
  return { me: me.data ?? null, userId, abilities, ready: me.isSuccess };
}

export function useDistributionPolicy() {
  return useQuery({ queryKey: caseKeys.policy, queryFn: fetchDistributionPolicy, staleTime: 60_000 });
}
