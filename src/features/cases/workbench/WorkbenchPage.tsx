import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  CheckCircle2,
  ChevronsUpDown,
  Download,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  Rows3,
  SearchX,
  X,
} from "lucide-react";
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
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
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
import { PRIORITY_BAR, PriorityBadge, SlaBadge, StatusBadge } from "../components/Badges";
import { Initials, RefId } from "../components/Fields";
import { ReassignDialog, type ReassignRequest } from "../components/ReassignDialog";
import { useCaseAbilities, useDistributionPolicy } from "../hooks/useCaseSession";
import { useCustomerLabel, useUserLabel } from "../hooks/useDisplayNames";
import { LIST_VIEWS, parseDrill, type AssigneeFilterMode, type CaseListView } from "../model/drill";
import {
  CLOSED_STATUS_CODES,
  CLOSED_STATUS_SET,
  OPEN_STATUS_CODES,
  formatGroupLabel,
  isOpenCase,
  normalizeGroupKey,
  priorityLevel,
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

type SortKey = "subject" | "customer" | "category" | "owner" | "status" | "sla" | "updated";

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
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  // Compact keeps a row to its subject and columns; turning it off opens each row to its case number and group.
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
  const paneOpen = Boolean(caseId);
  const data = useWorkbenchData(abilities.seesSupervisorStrip, policy.data?.dashboardRefreshSeconds ?? 30);
  const searchState = useWorkbenchSearch(search);
  const userLabel = useUserLabel(userId);
  const customerLabel = useCustomerLabel();

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
  const sortValue = (c: Case, key: SortKey): string | number => {
    switch (key) {
      case "subject":
        return c.title.toLowerCase();
      case "customer":
        return c.customerProfileId
          ? customerLabel(c.customerProfileId, c.conversations[0]?.customerName).toLowerCase()
          : "";
      case "category":
        return (c.category?.name ?? "").toLowerCase();
      case "owner":
        return c.assignedUserId ? userLabel(c.assignedUserId).toLowerCase() : "";
      case "status":
        return c.status.label.toLowerCase();
      case "sla":
        return c.slaMinutesRemaining ?? Number.POSITIVE_INFINITY;
      default:
        return Date.parse(c.updatedAt);
    }
  };
  const rows = sort
    ? [...visible].sort((a, b) => {
        const x = sortValue(a, sort.key);
        const y = sortValue(b, sort.key);
        const order =
          typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        return sort.dir === "asc" ? order : -order;
      })
    : visible;
  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current?.key !== key ? { key, dir: "asc" } : current.dir === "asc" ? { key, dir: "desc" } : null,
    );
  // Columns drop out in order of importance as room runs out (the open pane takes the room first);
  // what drops out moves to a second line under the subject, so nothing disappears.
  const wide = useMediaQuery("(min-width: 1280px)");
  const wider = useMediaQuery("(min-width: 1440px)");
  const widest = useMediaQuery("(min-width: 1600px)");
  const roomy = useMediaQuery("(min-width: 640px)");
  const showCustomer = wide && !paneOpen;
  const showOwner = wide && !paneOpen;
  const showCategory = wider && !paneOpen;
  const showUpdated = widest && !paneOpen;
  const header = (key: SortKey, label: string, className?: string, end = false) => (
    <th
      aria-sort={sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
      className={cn(
        "sticky top-0 z-10 border-b border-border bg-surface px-3 py-2.5 font-medium whitespace-nowrap",
        end ? "text-end" : "text-start",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={cn(
          "group/sort inline-flex items-center gap-1 tracking-wide uppercase transition-colors hover:text-foreground",
          sort?.key === key && "text-foreground",
        )}
      >
        {label}
        {sort?.key === key ? (
          sort.dir === "asc" ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : (
            <ArrowDown className="size-3" aria-hidden />
          )
        ) : (
          <ChevronsUpDown
            className="size-3 opacity-0 transition-opacity group-hover/sort:opacity-50"
            aria-hidden
          />
        )}
      </button>
    </th>
  );
  const unassignedInView = visible.filter((c) => !c.assignedUserId).length;
  // A filter counts as applied only when it differs from what the current view starts with.
  const viewDefaults = defaultFiltersForView(filters.listView);
  const sameStatuses = (other: ReadonlySet<string>) =>
    filters.statuses.size === other.size && [...filters.statuses].every((s) => other.has(s));
  const statusActive =
    filters.statuses.size > 0 &&
    filters.statuses.size < STATUS_CODES.length &&
    !sameStatuses(viewDefaults.statuses) &&
    !sameStatuses(new Set(OPEN_STATUS_CODES));
  const assigneeActive = filters.assignee !== "all" && filters.assignee !== viewDefaults.assignee;
  const statusSummary = sameStatuses(new Set(OPEN_STATUS_CODES))
    ? t("cases.filters.status-open")
    : sameStatuses(new Set(CLOSED_STATUS_CODES))
      ? t("cases.filters.status-closed")
      : undefined;
  const filtersActive =
    Boolean(search.trim()) ||
    statusActive ||
    assigneeActive ||
    Boolean(filters.group) ||
    (filters.priorities.size > 0 && filters.priorities.size < PRIORITY_CODES.length);
  const clearFilters = () => {
    // Unlike the source, Clear also drops the priority filter it counts as active.
    setFilters((f) => ({
      ...f,
      statuses: viewDefaults.statuses,
      priorities: new Set(),
      assignee: "all",
      group: null,
    }));
    setSearch("");
  };
  const showClaimColumn = filters.listView === "unassigned" && agentClaimAllowed;
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
                  <span
                    className={cn(
                      "min-w-5 rounded-full px-1.5 text-center text-[12px] leading-5 font-semibold tabular-nums",
                      filters.listView === view ? "bg-surface text-primary" : "bg-surface-2",
                    )}
                  >
                    {viewCount(view)}
                  </span>
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
            onClear={clearFilters}
            statusActive={statusActive}
            statusSummary={statusSummary}
            assigneeActive={assigneeActive}
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
                <div role="status" aria-busy className="divide-y divide-border/60">
                  <span className="sr-only">{t("cases.loading")}</span>
                  {Array.from({ length: 7 }, (_, index) => (
                    <div key={index} className="flex items-center gap-4 px-5 py-4" aria-hidden>
                      <div className="size-4 animate-pulse rounded bg-surface-2" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-2/5 animate-pulse rounded bg-surface-2" />
                        <div className="h-3 w-1/4 animate-pulse rounded bg-surface-2" />
                      </div>
                      <div className="hidden h-6 w-24 animate-pulse rounded-full bg-surface-2 sm:block" />
                      <div className="hidden h-6 w-20 animate-pulse rounded-full bg-surface-2 md:block" />
                    </div>
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <EmptyState
                  icon={filtersActive ? SearchX : filters.listView === "unassigned" ? CheckCircle2 : Inbox}
                  title={
                    search.trim()
                      ? t("cases.workbench.no-match", { query: search.trim() })
                      : filtersActive
                        ? t("cases.workbench.empty-filtered")
                        : filters.listView === "unassigned"
                          ? t("cases.workbench.empty-unassigned")
                          : t("cases.workbench.empty")
                  }
                  description={
                    filtersActive
                      ? t("cases.workbench.empty-filtered-hint")
                      : filters.listView === "unassigned"
                        ? t("cases.workbench.empty-unassigned-hint")
                        : undefined
                  }
                  action={
                    filtersActive ? (
                      <Button variant="outline" onClick={clearFilters}>
                        {t("cases.filters.clear")}
                      </Button>
                    ) : (
                      <Button onClick={() => void navigate("/cases/new")}>
                        <Plus />
                        {t("cases.create.title")}
                      </Button>
                    )
                  }
                />
              ) : (
                <table className="w-full table-fixed border-collapse text-sm">
                  <thead>
                    <tr className="text-[12px] text-muted-foreground">
                      <th className="sticky top-0 z-10 w-12 border-b border-border bg-surface py-2.5 ps-5 pe-1 text-start">
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
                      {header("subject", t("cases.workbench.col-subject"))}
                      {showCustomer && header("customer", t("cases.workbench.col-customer"), "w-36")}
                      {showCategory && header("category", t("cases.workbench.col-category"), "w-36")}
                      {showOwner && header("owner", t("cases.workbench.col-owner"), "w-36")}
                      {roomy && header("status", t("cases.workbench.col-status"), "w-[9.5rem]")}
                      {roomy && header("sla", t("cases.workbench.col-sla"), "w-32")}
                      {showUpdated && header("updated", t("cases.workbench.col-updated"), "w-24 pe-5", true)}
                      {showClaimColumn && (
                        <th className="sticky top-0 z-10 w-20 border-b border-border bg-surface" />
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const owner = row.assignedUserId ? userLabel(row.assignedUserId) : null;
                      const customer = row.customerProfileId
                        ? customerLabel(row.customerProfileId, row.conversations[0]?.customerName)
                        : null;
                      // What the columns leave out, kept under the subject.
                      const meta = [
                        !showCustomer && customer,
                        !showCategory && row.category?.name,
                        !showOwner && (owner ?? t("cases.unassigned")),
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <tr
                          key={row.id}
                          tabIndex={0}
                          data-selected={caseId === row.id || undefined}
                          onClick={() => selectCase(row.id)}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              selectCase(row.id);
                            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                              event.preventDefault();
                              const next =
                                event.key === "ArrowDown"
                                  ? event.currentTarget.nextElementSibling
                                  : event.currentTarget.previousElementSibling;
                              (next as HTMLElement | null)?.focus();
                            }
                          }}
                          className={cn(
                            "group cursor-pointer border-b border-border/60 transition-colors outline-none hover:bg-surface-2/60 focus-visible:bg-surface-2/60",
                            "data-[selected]:bg-primary-soft/40 data-[selected]:shadow-[inset_3px_0_0_var(--color-primary)]",
                            compact ? "h-11" : "h-14",
                          )}
                        >
                          <td className="relative ps-5 pe-1" onClick={(event) => event.stopPropagation()}>
                            <span
                              aria-hidden
                              className={cn(
                                "absolute inset-y-2.5 start-0 w-1 rounded-e-full",
                                PRIORITY_BAR[priorityLevel(row.priority)],
                              )}
                            />
                            <Checkbox
                              checked={selected.has(row.id)}
                              aria-label={t("cases.workbench.select-row", { ref: row.caseReferenceId })}
                              onCheckedChange={() => setSelected((s) => toggleIn(s, row.id))}
                            />
                          </td>
                          <td className="px-3" title={row.title}>
                            <div className="flex min-w-0 items-center gap-2">
                              <PriorityBadge priority={row.priority} variant="compact" />
                              <span className="truncate font-semibold">{row.title}</span>
                            </div>
                            {(!compact || meta) && (
                              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                                {!compact && (
                                  <>
                                    <RefId
                                      value={row.caseReferenceId}
                                      className="font-normal whitespace-nowrap"
                                    />
                                    <span aria-hidden>·</span>
                                    <span className="truncate">{groupLabel(row.assignedGroupId)}</span>
                                  </>
                                )}
                                {meta && (
                                  <span className="truncate">
                                    {!compact && <span aria-hidden>· </span>}
                                    {meta}
                                  </span>
                                )}
                              </div>
                            )}
                            {!roomy && (
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
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
                            )}
                          </td>
                          {showCustomer && (
                            <td className="px-3">
                              {customer ? (
                                <span className="flex min-w-0 items-center gap-2">
                                  <Initials name={customer} />
                                  <span className="truncate">{customer}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          )}
                          {showCategory && (
                            <td className="px-3">
                              {row.category ? (
                                <>
                                  <span className="block truncate font-medium text-foreground/90">
                                    {row.category.name}
                                  </span>
                                  {!compact && row.subCategory && (
                                    <span className="block truncate text-xs text-muted-foreground">
                                      {row.subCategory.name}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          )}
                          {showOwner && (
                            <td className="px-3">
                              {owner ? (
                                <span className="flex min-w-0 items-center gap-2">
                                  <Initials name={owner} />
                                  <span className="truncate">{owner}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">{t("cases.unassigned")}</span>
                              )}
                            </td>
                          )}
                          {roomy && (
                            <td className="px-3">
                              <StatusBadge
                                label={row.status.label}
                                code={row.status.code}
                                category={row.status.statusCategory}
                              />
                            </td>
                          )}
                          {roomy && (
                            <td className="px-3">
                              <SlaBadge
                                slaState={row.slaState}
                                slaTimeLabel={row.slaTimeLabel}
                                slaMinutesRemaining={row.slaMinutesRemaining}
                                slaPausedAt={row.slaPausedAt}
                              />
                            </td>
                          )}
                          {showUpdated && (
                            <td className="ps-3 pe-5 text-end text-xs text-muted-foreground tabular-nums">
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
