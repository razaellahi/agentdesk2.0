import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  caseKeys,
  fetchSupervisorDashboard,
  listCases,
  searchWorkbenchCases,
  type Case,
  type CaseConnection,
  type CaseListKind,
} from "../api";
import { primeUserNames } from "../hooks/useDisplayNames";

export const PAGE_SIZE = 100;

function useCasePool(kind: CaseListKind) {
  return useInfiniteQuery({
    queryKey: caseKeys.list(kind),
    queryFn: ({ pageParam }) => listCases(kind, PAGE_SIZE, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: CaseConnection) =>
      last.pageInfo.hasNextPage ? last.pageInfo.endCursor : undefined,
  });
}

const flatten = (pages: CaseConnection[] | undefined): Case[] => pages?.flatMap((page) => page.nodes) ?? [];

/**
 * The three Workbench pools (all / unassigned / mine), loaded in parallel like the
 * source forkJoin, each with its own "Load more" cursor.
 */
export function useWorkbenchData(supervisorStrip: boolean, refreshSeconds: number) {
  const queryClient = useQueryClient();
  const all = useCasePool("all");
  const unassigned = useCasePool("unassigned");
  const mine = useCasePool("my");

  const cases = useMemo(() => flatten(all.data?.pages), [all.data]);
  const unassignedCases = useMemo(() => flatten(unassigned.data?.pages), [unassigned.data]);
  const myCases = useMemo(() => flatten(mine.data?.pages), [mine.data]);

  useEffect(() => {
    primeUserNames([...cases, ...unassignedCases, ...myCases].map((c) => c.assignedUserId));
  }, [cases, unassignedCases, myCases]);

  const supervisor = useQuery({
    queryKey: caseKeys.supervisor,
    queryFn: fetchSupervisorDashboard,
    enabled: supervisorStrip,
    // The team strip refreshes at least every 60s (tenant policy help text).
    refetchInterval: Math.max(60, refreshSeconds) * 1000,
  });

  const pools: Record<CaseListKind, ReturnType<typeof useCasePool>> = { all, unassigned, my: mine };
  return {
    cases,
    unassignedCases,
    myCases,
    pools,
    supervisor: supervisor.data ?? null,
    loading: all.isPending || unassigned.isPending || mine.isPending,
    error: all.error ?? unassigned.error ?? mine.error ?? null,
    refreshing: all.isRefetching || unassigned.isRefetching || mine.isRefetching,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["cases", "list"] }),
  };
}

/** 300ms-debounced server search across the agent's readable cases (incl. closed). */
export function useWorkbenchSearch(query: string) {
  const [debounced, setDebounced] = useState(query.trim());
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);
  const term = query.trim();
  const result = useQuery({
    queryKey: caseKeys.search(debounced),
    queryFn: () => searchWorkbenchCases(debounced),
    enabled: Boolean(debounced),
  });
  if (!term) return { active: false, loading: false, results: null as Case[] | null };
  const settled = debounced === term && !result.isFetching;
  return {
    active: true,
    loading: !settled,
    results: settled ? (result.isError ? [] : (result.data ?? [])) : null,
  };
}
