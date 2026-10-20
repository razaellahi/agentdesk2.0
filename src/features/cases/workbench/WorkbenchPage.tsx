import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, Download, Inbox, Loader2, Plus, RefreshCw, Rows3, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { ResizeHandle } from "@/components/common/ResizeHandle";
import { EmptyState } from "@/components/common/ListChrome";
import { QueryError } from "@/components/common/QueryError";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/core/i18n";
import { useResizableWidth } from "@/shared/hooks/useResizableWidth";
import { cn } from "@/shared/lib/utils";
import {
  bulkClaimCases,
  bulkCloseCases,
  bulkReassignCases,
  bulkResolveCases,
  caseKeys,
  claimCase,
  exportCasesCsv,
  type BulkResult,
  type Case,
  type CaseListKind,
  type ReassignInput,
} from "../api";
import { PriorityBadge, SlaBadge, StatusBadge } from "../components/Badges";
import { Initials, RefId } from "../components/Fields";
import { ReassignDialog, type ReassignRequest } from "../components/ReassignDialog";
import { useCaseAbilities, useDistributionPolicy } from "../hooks/useCaseSession";
import { useUserLabel } from "../hooks/useDisplayNames";
import { LIST_VIEWS, parseDrill, type AssigneeFilterMode, type CaseListView } from "../model/drill";
import {
  CLOSED_STATUS_SET,
  OPEN_STATUS_CODES,
  formatGroupLabel,
  isOpenCase,
  normalizeGroupKey,
} from "../model/format";
import {
  countSlaInPool,
  defaultFiltersForView,
  filterWorkbenchCases,
  type WorkbenchFilters as Filters,
} from "../model/workbench";
import { CaseDetailPane } from "./CaseDetailPane";
import { useWorkbenchData, useWorkbenchSearch } from "./useWorkbenchData";
import { WorkbenchFilters } from "./WorkbenchFilters";

const STATUS_CODES = [
  "NEW",
  "UNASSIGNED",
  "IN_PROGRESS",
  "PENDING_CUSTOMER",
  "PENDING_INTERNAL",
  "RESOLVED",
  "CLOSED",
];
const PRIORITY_CODES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

/** Only the urgency views carry a status dot; the rest stay quiet. */
const RAIL_DOT: Partial<Record<CaseListView, string>> = {
  at_risk: "bg-warning",
  breached: "bg-destructive",
};

type BulkAction = "claim" | "reassign" | "resolve" | "close";

/** First paint: the unassigned pool with open statuses and any assignee, as the source signals start. */
function initialFilters(): Filters {
  return {
    listView: "unassigned",
    group: null,
    statuses: new Set(OPEN_STATUS_CODES),
    priorities: new Set(),
    assignee: "all",
    assigneeUserId: null,
    slaDueSoonOnly: false,
    createdSince: null,
    sortBySla: false,
  };
}

/** Apply a dashboard/report drill link on top of the current filters (applyWorkbenchDrillParams). */
function withDrill(current: Filters, params: URLSearchParams): Filters {
  const drill = parseDrill(params);
  if (!drill) return current;
  return {
    ...current,
    listView: drill.listView ?? current.listView,
    group: drill.group,
    statuses: drill.statuses ?? current.statuses,
    priorities: drill.priorities ?? current.priorities,
    assignee: drill.assigneeFilter,
    assigneeUserId: drill.assigneeUserId,
    slaDueSoonOnly: drill.slaDueSoonOnly,
    createdSince: drill.createdSince,
  };
}

function relativeUpdated(iso: string, justNow: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return justNow;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return formatDate(iso);
}

/** Case Workbench: list views, filters, bulk actions and the case pane (workbench.component.ts). */
export default function WorkbenchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { userId, abilities } = useCaseAbilities();
  const policy = useDistributionPolicy();
  const agentClaimAllowed = policy.data?.agentClaimAllowed ?? true;

  const [filters, setFilters] = useState<Filters>(() => withDrill(initialFilters(), params));
  // Re-apply drill links when the URL changes while mounted (notification / dashboard clicks).
  const [appliedParams, setAppliedParams] = useState(params.toString());
  if (appliedParams !== params.toString()) {
    setAppliedParams(params.toString());
    setFilters((current) => withDrill(current, params));
  }
  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(true);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulkResult, setBulkResult] = useState<{
    ok: number;
    failed: { label: string; reason: string }[];
  } | null>(null);
  const [reassign, setReassign] = useState<{ request: ReassignRequest; ids: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pane = useResizableWidth({
    storageKey: "cases.detailWidth",
    defaultWidth: 440,
    minWidth: 320,
    maxWidth: 720,
    direction: "left",
  });

  const caseId = params.get("caseId");
  const data = useWorkbenchData(abilities.seesSupervisorStrip, policy.data?.dashboardRefreshSeconds ?? 30);
  const searchState = useWorkbenchSearch(search);
  const userLabel = useUserLabel(userId);

  const pool =
    filters.listView === "unassigned"
      ? data.unassignedCases
      : filters.listView === "my"
        ? data.myCases
        : data.cases;
  const visible = useMemo(
    () => filterWorkbenchCases(searchState.active ? (searchState.results ?? []) : pool, filters, userId),
    [searchState.active, searchState.results, pool, filters, userId],
  );

  const groupOptions = useMemo(() => {
    const fromDash =
      data.supervisor?.groups.map((g) => ({
        key: g.groupKey,
        label: g.groupLabel,
        hint: [
          t("cases.workbench.team-pill", { open: g.openCount, unassigned: g.unassignedCount }),
          g.atRiskCount > 0 && t("cases.workbench.n-at-risk", { count: g.atRiskCount }),
          g.breachedCount > 0 && t("cases.workbench.n-breached", { count: g.breachedCount }),
        ]
          .filter(Boolean)
          .join(" · "),
      })) ?? [];
    if (fromDash.length) return fromDash;
    const keys = new Map<string, string>();
    for (const c of data.cases)
      if (c.assignedGroupId)
        keys.set(normalizeGroupKey(c.assignedGroupId), formatGroupLabel(c.assignedGroupId));
    return [...keys]
      .map(([key, label]) => ({ key, label, hint: undefined as string | undefined }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data.supervisor, data.cases, t]);
  const groupLabel = (id: string | null) =>
    id ? (groupOptions.find((g) => g.key === normalizeGroupKey(id))?.label ?? formatGroupLabel(id)) : "—";

  const byId = useMemo(
    () => new Map([...data.unassignedCases, ...data.cases, ...data.myCases].map((c) => [c.id, c])),
    [data.unassignedCases, data.cases, data.myCases],
  );
  const selectedCases = [...selected].map((id) => byId.get(id)).filter((c): c is Case => Boolean(c));

  const viewLabel = (view: CaseListView) =>
    view === "all" && abilities.groupScopedSupervisor ? t("cases.views.team") : t(`cases.views.${view}`);
  const viewCount = (view: CaseListView) => {
    switch (view) {
      case "unassigned":
        return data.unassignedCases.length;
      case "my":
        return data.myCases.length;
      case "at_risk":
        return countSlaInPool(data.cases, "WARNING");
      case "breached":
        return countSlaInPool(data.cases, "BREACHED");
      case "closed":
        return data.cases.filter((c) => CLOSED_STATUS_SET.has(c.status.code)).length;
      default:
        return data.cases.length;
    }
  };

  const setView = (view: CaseListView) => {
    const defaults = defaultFiltersForView(view);
    setSelected(new Set());
    setBulkResult(null);
    setFilters((f) => ({
      ...f,
      listView: view,
      statuses: defaults.statuses,
      assignee: defaults.assignee,
      sortBySla: defaults.sortBySla ?? f.sortBySla,
    }));
    void data.refresh();
  };

  const setGroup = (group: string | null) =>
    setFilters((f) => ({ ...f, group, listView: group ? "all" : f.listView }));

  const toggleIn = (set: ReadonlySet<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const selectCase = (id: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (id) next.set("caseId", id);
        else next.delete("caseId");
        return next;
      },
      { replace: true },
    );

  const refreshAfter = (updated?: Case) => {
    if (updated) queryClient.setQueryData(caseKeys.detail(updated.id), updated);
    void queryClient.invalidateQueries({ queryKey: ["cases", "list"] });
    void queryClient.invalidateQueries({ queryKey: ["cases", "search"] });
    void queryClient.invalidateQueries({ queryKey: caseKeys.supervisor });
  };

  const claim = useMutation({
    mutationFn: claimCase,
    onSuccess: (updated) => {
      refreshAfter(updated);
      selectCase(updated.id);
    },
    onError: (cause: Error) => setError(cause.message || t("cases.workbench.claim-failed")),
  });

  const bulk = useMutation({
    mutationFn: ({ action, ids, input }: { action: BulkAction; ids: string[]; input?: ReassignInput }) => {
      switch (action) {
        case "claim":
          return bulkClaimCases(ids);
        case "resolve":
          return bulkResolveCases(ids);
        case "close":
          return bulkCloseCases(ids);
        default:
          return bulkReassignCases(ids, input!);
      }
    },
    onMutate: () => setBulkResult(null),
    onSuccess: (result: BulkResult) => {
      setBulkResult({
        ok: result.succeeded.length,
        failed: result.failed.map((f) => ({
          label: byId.get(f.caseId)?.caseReferenceId ?? f.caseId,
          reason: f.message,
        })),
      });
      // Failed rows stay selected so the agent can retry or act on them.
      setSelected(new Set(result.failed.map((f) => f.caseId)));
      refreshAfter();
    },
    onError: (cause: Error) => setError(cause.message || t("cases.workbench.bulk-failed")),
  });

  const exporting = useMutation({
    mutationFn: () => {
      const view: CaseListKind =
        filters.listView === "unassigned" || filters.listView === "my" ? filters.listView : "all";
      return exportCasesCsv(view);
    },
    onError: (cause: Error) => setError(cause.message || t("cases.export-failed")),
  });

  // Client-side eligibility is a convenience; each bulk mutation re-checks per case.
  const bulkActions: { id: BulkAction; label: string }[] = [];
  if (selectedCases.length > 0) {
    if (agentClaimAllowed && selectedCases.every((c) => !c.assignedUserId))
      bulkActions.push({ id: "claim", label: t("cases.bulk.claim") });
    if (abilities.bulkReassign && selectedCases.every(isOpenCase))
      bulkActions.push({ id: "reassign", label: t("cases.bulk.reassign") });
    if (selectedCases.every(abilities.canBulkResolve))
      bulkActions.push({ id: "resolve", label: t("cases.bulk.resolve") });
    if (
      selectedCases.every(
        (c) =>
          (c.status.statusCategory === "RESOLVED" || c.status.code === "RESOLVED") &&
          abilities.manageLifecycle(c),
      )
    )
      bulkActions.push({ id: "close", label: t("cases.bulk.close") });
  }

  const runBulk = (action: BulkAction) => {
    const ids = [...selected];
    if (!ids.length || bulk.isPending) return;
    if (action === "reassign") {
      setReassign({
        ids,
        request: {
          subject: t("cases.bulk.n-selected", { count: ids.length }),
          currentGroupId: null,
          currentAssigneeId: null,
          verb: "reassign",
        },
      });
      return;
    }
    bulk.mutate({ action, ids });
  };

  const activePool =
    data.pools[filters.listView === "unassigned" ? "unassigned" : filters.listView === "my" ? "my" : "all"];
  const showLoadMore = !searchState.active && Boolean(activePool.hasNextPage);
  const allVisibleSelected = visible.length > 0 && visible.every((c) => selected.has(c.id));
  const unassignedInView = visible.filter((c) => !c.assignedUserId).length;
  const showClaimColumn = filters.listView === "unassigned" && agentClaimAllowed;
  const paneOpen = Boolean(caseId);
  const viewTabs = useRef<HTMLElement>(null);
  useEffect(() => {
    viewTabs.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [filters.listView]);

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border px-5">
          <div className="flex items-center gap-3 pt-3">
            <nav
              ref={viewTabs}
              aria-label={t("cases.views.label")}
              className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 pb-0.5"
            >
              {LIST_VIEWS.map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setView(view)}
                  aria-current={filters.listView === view ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
                    filters.listView === view &&
                      "bg-primary-soft font-medium text-primary hover:bg-primary-soft hover:text-primary",
                  )}
                >
                  {RAIL_DOT[view] && (
                    <span className={cn("size-1.5 rounded-full", RAIL_DOT[view])} aria-hidden />
                  )}
                  {viewLabel(view)}
                  <span className="text-xs tabular-nums opacity-70">{viewCount(view)}</span>
                </button>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="icon-sm"
                variant={filters.sortBySla ? "secondary" : "ghost"}
                aria-label={t("cases.workbench.sort-sla")}
                title={t("cases.workbench.sort-sla")}
                aria-pressed={filters.sortBySla}
                onClick={() => setFilters((f) => ({ ...f, sortBySla: !f.sortBySla }))}
              >
                <ArrowDownUp />
              </Button>
              <Button
                size="icon-sm"
                variant={compact ? "secondary" : "ghost"}
                aria-label={t("cases.workbench.compact")}
                title={t("cases.workbench.compact")}
                aria-pressed={compact}
                onClick={() => setCompact((v) => !v)}
              >
                <Rows3 />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t("cases.refresh")}
                title={t("cases.refresh")}
                onClick={() => void data.refresh()}
              >
                <RefreshCw className={cn(data.refreshing && "animate-spin")} />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={exporting.isPending ? t("cases.exporting") : t("cases.export-csv")}
                title={t("cases.export-csv")}
                disabled={exporting.isPending}
                onClick={() => exporting.mutate()}
              >
                <Download />
              </Button>
              <Button size="sm" asChild className="ms-1">
                <Link to="/cases/new">
                  <Plus />
                  {t("cases.new-case")}
                </Link>
              </Button>
            </div>
          </div>
          <WorkbenchFilters
            className="py-3"
            search={search}
            searchLoading={searchState.loading}
            onSearch={setSearch}
            statusOptions={STATUS_CODES.map((id) => ({
              id,
              label: t(`cases.status.${id.toLowerCase().replace(/_/g, "-")}`),
            }))}
            statuses={filters.statuses}
            onToggleStatus={(id) => setFilters((f) => ({ ...f, statuses: toggleIn(f.statuses, id) }))}
            priorityOptions={PRIORITY_CODES.map((id) => ({
              id,
              label: t(`cases.priority.${id.toLowerCase()}`),
            }))}
            priorities={filters.priorities}
            onTogglePriority={(id) => setFilters((f) => ({ ...f, priorities: toggleIn(f.priorities, id) }))}
            groups={groupOptions}
            group={filters.group}
            onGroup={setGroup}
            assignee={filters.assignee}
            onAssignee={(assignee: AssigneeFilterMode) => setFilters((f) => ({ ...f, assignee }))}
            onClear={() => {
              const defaults = defaultFiltersForView(filters.listView);
              // Unlike the source, Clear also drops the priority filter it counts as active.
              setFilters((f) => ({
                ...f,
                statuses: defaults.statuses,
                priorities: new Set(),
                assignee: "all",
                group: null,
              }));
              setSearch("");
            }}
          />
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <QueryError error={data.error} onRetry={() => void data.refresh()} />
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 border-b border-destructive/30 bg-destructive-soft px-4 py-2 text-sm text-destructive-text"
              >
                <span className="flex-1">{error}</span>
                <button type="button" onClick={() => setError(null)} aria-label={t("cases.dismiss")}>
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-auto">
              {data.loading || searchState.loading ? (
                <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> {t("cases.loading")}
                </p>
              ) : visible.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title={
                    search.trim()
                      ? t("cases.workbench.no-match", { query: search.trim() })
                      : filters.listView === "unassigned"
                        ? t("cases.workbench.empty-unassigned")
                        : t("cases.workbench.empty")
                  }
                  action={
                    <Button onClick={() => void navigate("/cases/new")}>
                      <Plus />
                      {t("cases.create.title")}
                    </Button>
                  }
                />
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="sticky top-0 z-10 w-10 border-b border-border bg-surface py-2 ps-5 pe-1 text-start">
                        <Checkbox
                          checked={allVisibleSelected}
                          aria-label={t("cases.workbench.select-all")}
                          onCheckedChange={() => {
                            const next = new Set(selected);
                            visible.forEach((c) => (allVisibleSelected ? next.delete(c.id) : next.add(c.id)));
                            setSelected(next);
                          }}
                        />
                      </th>
                      <th className="sticky top-0 z-10 border-b border-border bg-surface px-3 py-2 text-start font-medium">
                        {t("cases.workbench.col-subject")}
                      </th>
                      {!paneOpen && (
                        <th className="sticky top-0 z-10 hidden border-b border-border bg-surface px-3 py-2 text-start font-medium md:table-cell">
                          {t("cases.workbench.col-owner")}
                        </th>
                      )}
                      {!paneOpen && (
                        <th className="sticky top-0 z-10 hidden border-b border-border bg-surface px-3 py-2 text-start font-medium sm:table-cell">
                          {t("cases.workbench.col-status")}
                        </th>
                      )}
                      {!paneOpen && (
                        <th className="sticky top-0 z-10 hidden border-b border-border bg-surface px-3 py-2 text-start font-medium sm:table-cell">
                          {t("cases.workbench.col-sla")}
                        </th>
                      )}
                      {!paneOpen && (
                        <th className="sticky top-0 z-10 hidden border-b border-border bg-surface px-3 py-2 text-end font-medium xl:table-cell">
                          {t("cases.workbench.col-updated")}
                        </th>
                      )}
                      {showClaimColumn && (
                        <th className="sticky top-0 z-10 w-20 border-b border-border bg-surface" />
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row) => {
                      const owner = row.assignedUserId ? userLabel(row.assignedUserId) : null;
                      return (
                        <tr
                          key={row.id}
                          data-selected={caseId === row.id || undefined}
                          onClick={() => selectCase(row.id)}
                          className={cn(
                            "group cursor-pointer border-b border-border/60 transition-colors hover:bg-surface-2/60",
                            "data-[selected]:bg-primary-soft/40 data-[selected]:shadow-[inset_3px_0_0_var(--color-primary)]",
                            compact ? "h-11" : "h-[3.75rem]",
                            paneOpen && "h-[4.25rem]",
                          )}
                        >
                          <td className="ps-5 pe-1" onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(row.id)}
                              aria-label={t("cases.workbench.select-row", { ref: row.caseReferenceId })}
                              onCheckedChange={() => setSelected((s) => toggleIn(s, row.id))}
                            />
                          </td>
                          <td className="w-full max-w-0 px-3" title={`${row.caseReferenceId} — ${row.title}`}>
                            <div className="flex min-w-0 items-center gap-2">
                              <PriorityBadge priority={row.priority} variant="compact" />
                              <span className="truncate font-medium">{row.title}</span>
                            </div>
                            <div
                              className={cn(
                                "mt-1 flex flex-wrap items-center gap-x-3 gap-y-1",
                                !paneOpen && "sm:hidden",
                              )}
                            >
                              <StatusBadge
                                label={row.status.label}
                                code={row.status.code}
                                category={row.status.statusCategory}
                              />
                              <SlaBadge
                                slaState={row.slaState}
                                slaTimeLabel={row.slaTimeLabel}
                                slaMinutesRemaining={row.slaMinutesRemaining}
                                slaPausedAt={row.slaPausedAt}
                              />
                            </div>
                            {!compact && (
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                <RefId value={row.caseReferenceId} className="font-normal" />
                                {" · "}
                                {groupLabel(row.assignedGroupId)}
                                {paneOpen && ` · ${owner ?? t("cases.unassigned")}`}
                              </span>
                            )}
                          </td>
                          {!paneOpen && (
                            <td className="hidden px-3 whitespace-nowrap md:table-cell">
                              {owner ? (
                                <span className="flex items-center gap-2">
                                  <Initials name={owner} />
                                  <span className="max-w-32 truncate">{owner}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">{t("cases.unassigned")}</span>
                              )}
                            </td>
                          )}
                          {!paneOpen && (
                            <td className="hidden px-3 whitespace-nowrap sm:table-cell">
                              <StatusBadge
                                label={row.status.label}
                                code={row.status.code}
                                category={row.status.statusCategory}
                              />
                            </td>
                          )}
                          {!paneOpen && (
                            <td className="hidden px-3 whitespace-nowrap sm:table-cell">
                              <SlaBadge
                                slaState={row.slaState}
                                slaTimeLabel={row.slaTimeLabel}
                                slaMinutesRemaining={row.slaMinutesRemaining}
                                slaPausedAt={row.slaPausedAt}
                              />
                            </td>
                          )}
                          {!paneOpen && (
                            <td className="hidden px-3 text-end text-xs whitespace-nowrap text-muted-foreground tabular-nums xl:table-cell">
                              {relativeUpdated(row.updatedAt, t("cases.just-now"))}
                            </td>
                          )}
                          {showClaimColumn && (
                            <td className="px-3 text-end" onClick={(event) => event.stopPropagation()}>
                              <Button
                                size="xs"
                                variant="outline"
                                disabled={claim.isPending && claim.variables === row.id}
                                onClick={() => claim.mutate(row.id)}
                              >
                                {claim.isPending && claim.variables === row.id ? (
                                  <Loader2 className="animate-spin" />
                                ) : (
                                  t("cases.claim")
                                )}
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {showLoadMore && !data.loading && (
                <div className="flex justify-center p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activePool.isFetchingNextPage}
                    onClick={() => void activePool.fetchNextPage()}
                  >
                    {activePool.isFetchingNextPage ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      t("cases.workbench.load-more")
                    )}
                  </Button>
                </div>
              )}
            </div>

            {!data.loading && visible.length > 0 && (
              <p className="border-t border-border px-5 py-2 text-xs text-muted-foreground tabular-nums">
                {t("cases.workbench.count", { count: visible.length })}
                {unassignedInView > 0 && (
                  <span className="text-warning-text">
                    {" · "}
                    {t("cases.workbench.n-unassigned", { count: unassignedInView })}
                  </span>
                )}
              </p>
            )}

            {selected.size > 0 && (
              <div
                className="flex flex-wrap items-center gap-2 border-t border-border bg-surface px-4 py-2"
                role="region"
                aria-label={t("cases.bulk.label")}
              >
                <span className="text-sm font-medium">
                  {t("cases.bulk.n-selected", { count: selected.size })}
                </span>
                {bulkActions.map((action) => (
                  <Button
                    key={action.id}
                    size="sm"
                    variant="outline"
                    disabled={bulk.isPending}
                    onClick={() => runBulk(action.id)}
                  >
                    {action.label}
                  </Button>
                ))}
                {bulkActions.length === 0 && (
                  <span className="text-xs text-muted-foreground">{t("cases.bulk.none")}</span>
                )}
                {bulk.isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                <Button size="sm" variant="ghost" className="ms-auto" onClick={() => setSelected(new Set())}>
                  {t("cases.bulk.clear")}
                </Button>
              </div>
            )}
            {bulkResult && (
              <div role="status" className="border-t border-border bg-surface-2/60 px-4 py-2 text-xs">
                <span className="font-medium">
                  {t("cases.bulk.result", { ok: bulkResult.ok, failed: bulkResult.failed.length })}
                </span>
                {bulkResult.failed.length > 0 && (
                  <ul className="mt-1 list-disc ps-5 text-destructive-text">
                    {bulkResult.failed.map((f) => (
                      <li key={f.label}>
                        {f.label}: {f.reason}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="ms-2 text-muted-foreground underline"
                  onClick={() => setBulkResult(null)}
                >
                  {t("cases.dismiss")}
                </button>
              </div>
            )}
          </div>

          {caseId && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
                aria-label={t("cases.detail.close")}
                onClick={() => selectCase(null)}
              />
              <ResizeHandle
                className="max-lg:hidden"
                onPointerDown={pane.onPointerDown}
                onKeyDown={pane.onKeyDown}
                onDoubleClick={pane.onDoubleClick}
                isDragging={pane.isDragging}
                ariaLabel={t("cases.detail.resize")}
              />
              <aside
                aria-label={t("cases.detail.label")}
                className="min-h-0 shrink-0 bg-surface max-lg:fixed max-lg:inset-y-0 max-lg:end-0 max-lg:z-40 max-lg:w-[min(32rem,100vw)] max-lg:border-s max-lg:border-border max-lg:shadow-xl lg:w-[var(--pane-w)]"
                style={{ "--pane-w": `${pane.width}px` } as CSSProperties}
              >
                <CaseDetailPane
                  key={caseId}
                  caseId={caseId}
                  currentUserId={userId}
                  abilities={abilities}
                  agentClaimAllowed={agentClaimAllowed}
                  onUpdated={(updated) => refreshAfter(updated)}
                  onClose={() => selectCase(null)}
                />
              </aside>
            </>
          )}
        </div>
      </section>

      <ReassignDialog
        request={reassign?.request ?? null}
        onCancel={() => setReassign(null)}
        onSubmit={(input) => {
          const ids = reassign?.ids ?? [];
          setReassign(null);
          bulk.mutate({ action: "reassign", ids, input });
          toast.message(t("cases.bulk.reassigning", { count: ids.length }));
        }}
      />
    </div>
  );
}
