import { useQuery } from "@tanstack/react-query";
import { Loader2, PieChart, RefreshCw, Rows3 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { useNow } from "@/shared/hooks/useNow";
import { cn } from "@/shared/lib/utils";
import { fetchOperationsDashboard } from "../api";
import { PriorityBadge } from "../components/Badges";
import { BarList, DonutChart, KpiTile } from "../components/Charts";
import { useUserLabel } from "../hooks/useDisplayNames";
import { workbenchLink, type DrillParams } from "../model/drill";
import { formatDueIn, formatMinutes } from "../model/format";
import { periodFilter, type Period } from "../model/reportRange";
import { PeriodFilter } from "./PeriodFilter";

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Live operations dashboard with drill-through to the Workbench (dashboard.component.ts). */
export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const now = useNow();
  const [period, setPeriod] = useState<Period>({ kind: "live" });
  const [group, setGroup] = useState<string | null>(null);

  const filter = periodFilter(period);
  const query = useQuery({
    queryKey: ["cases", "operations", group, filter],
    queryFn: () => fetchOperationsDashboard(group, filter),
    // Polls at the tenant's dashboard refresh; TanStack pauses while the tab is hidden.
    refetchInterval: (q) => (q.state.data?.refreshIntervalSeconds || 30) * 1000,
    placeholderData: (previous) => previous,
  });
  const data = query.data;
  const userLabel = useUserLabel(null, data?.byAssignee.map((row) => row.userId) ?? []);
  const live = period.kind === "live";
  const secondsAgo = query.dataUpdatedAt ? Math.max(0, Math.floor((now - query.dataUpdatedAt) / 1000)) : null;

  const drill = (params: DrillParams) =>
    workbenchLink({ ...params, group: params.group ?? group ?? undefined });
  const metaLine =
    period.kind === "live"
      ? t("cases.dashboard.meta-live")
      : filter
        ? t("cases.dashboard.meta-period", {
            range: `${new Date(filter.dateFrom).toLocaleDateString()} – ${new Date(filter.dateTo).toLocaleDateString()}`,
          })
        : "";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{t("nav.cases-dashboard")}</h1>
            <p className="text-sm text-muted-foreground">{t("cases.dashboard.description")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "size-2 rounded-full",
                  query.isError ? "bg-destructive" : "animate-pulse bg-success",
                )}
                aria-hidden
              />
              {t("cases.dashboard.live")}
              {secondsAgo != null && <span>· {t("cases.dashboard.updated-ago", { count: secondsAgo })}</span>}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              <RefreshCw className={cn(query.isFetching && "animate-spin")} />
              {t("cases.refresh")}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/cases">
                <Rows3 />
                {t("nav.cases-workbench")}
              </Link>
            </Button>
          </div>
        </div>

        <PeriodFilter value={period} onChange={setPeriod} allowLive meta={metaLine} />

        {query.error && (
          <p role="alert" className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive-text">
            {query.error.message}
          </p>
        )}

        {query.isPending ? (
          <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("cases.loading")}
          </p>
        ) : data ? (
          <>
            <section
              className="grid grid-cols-2 gap-3 md:grid-cols-5"
              aria-label={t("cases.dashboard.key-metrics")}
            >
              <Link to={drill({ listView: "all" })}>
                <KpiTile
                  label={t("cases.dashboard.open")}
                  value={data.totals.open}
                  footnote={
                    data.totals.oldestOpenAgeMinutes != null
                      ? t("cases.dashboard.oldest", { age: formatMinutes(data.totals.oldestOpenAgeMinutes) })
                      : null
                  }
                />
              </Link>
              <Link to={drill({ listView: "unassigned" })}>
                <KpiTile label={t("cases.unassigned")} value={data.totals.unassigned} />
              </Link>
              <Link to={drill({ listView: "at_risk" })}>
                <KpiTile label={t("cases.dashboard.at-risk")} value={data.totals.atRisk} tone="bad" />
              </Link>
              <Link to={drill({ listView: "breached" })}>
                <KpiTile label={t("cases.dashboard.breached")} value={data.totals.breached} tone="bad" />
              </Link>
              <Link to={drill({ createdSince: "today" })}>
                <KpiTile
                  label={live ? t("cases.dashboard.created-today") : t("cases.dashboard.created-period")}
                  value={data.totals.createdToday}
                />
              </Link>
            </section>

            <section
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              aria-label={live ? t("cases.dashboard.last-hour") : t("cases.dashboard.in-period")}
            >
              <KpiTile
                label={t(live ? "cases.dashboard.claims-1h" : "cases.dashboard.claims")}
                value={data.velocity.claimsLastHour}
              />
              <KpiTile
                label={t(live ? "cases.dashboard.resolves-1h" : "cases.dashboard.resolves")}
                value={data.velocity.resolvesLastHour}
              />
              <KpiTile
                label={t(live ? "cases.dashboard.reassignments-1h" : "cases.dashboard.reassignments")}
                value={data.velocity.reassignmentsLastHour}
              />
            </section>

            {data.byGroup.length > 0 && (
              <Panel
                title={t("cases.dashboard.team-health")}
                action={
                  group && (
                    <Button variant="link" size="sm" onClick={() => setGroup(null)}>
                      {t("cases.dashboard.clear-team")}
                    </Button>
                  )
                }
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.byGroup.map((g) => (
                    <div
                      key={g.groupKey}
                      className={cn(
                        "rounded-xl border p-3",
                        group === g.groupKey ? "border-primary bg-primary-soft/30" : "border-border",
                      )}
                    >
                      <button
                        type="button"
                        className="w-full text-start"
                        aria-pressed={group === g.groupKey}
                        onClick={() => setGroup(group === g.groupKey ? null : g.groupKey)}
                      >
                        <span className="flex justify-between gap-2 text-sm">
                          <strong className="truncate">{g.groupLabel}</strong>
                          <span className="shrink-0 tabular-nums">
                            {t("cases.dashboard.n-open", { count: g.openCount })}
                          </span>
                        </span>
                        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-surface-2">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{
                              width: `${data.totals.open > 0 ? Math.max(8, Math.round((g.openCount / data.totals.open) * 100)) : 0}%`,
                            }}
                          />
                        </span>
                        <span className="mt-2 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                          <span>{t("cases.workbench.n-unassigned", { count: g.unassignedCount })}</span>
                          {g.atRiskCount > 0 && (
                            <span className="text-warning-text">
                              {t("cases.workbench.n-at-risk", { count: g.atRiskCount })}
                            </span>
                          )}
                          {g.breachedCount > 0 && (
                            <span className="text-destructive-text">
                              {t("cases.workbench.n-breached", { count: g.breachedCount })}
                            </span>
                          )}
                        </span>
                      </button>
                      <Link
                        to={drill({ group: g.groupKey, listView: "all" })}
                        className="mt-2 inline-block text-xs text-primary hover:underline"
                      >
                        {t("cases.dashboard.open-in-workbench")}
                      </Link>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title={t("cases.dashboard.by-status")}>
                {data.byStatus.length === 0 ? (
                  <EmptyState icon={PieChart} title={t("cases.dashboard.no-open")} className="min-h-40 p-4" />
                ) : (
                  <DonutChart
                    label={t("cases.dashboard.by-status")}
                    data={data.byStatus.map((r) => ({ key: r.key, label: r.label, value: r.count }))}
                    onSelect={(status) => void navigate(drill({ status, listView: "all" }))}
                  />
                )}
              </Panel>
              <Panel title={t("cases.dashboard.by-priority")}>
                {data.byPriority.length === 0 ? (
                  <EmptyState icon={PieChart} title={t("cases.dashboard.no-open")} className="min-h-40 p-4" />
                ) : (
                  <BarList
                    data={data.byPriority.map((r) => ({ key: r.key, label: r.label, value: r.count }))}
                    onSelect={(priority) => void navigate(drill({ priority, listView: "all" }))}
                  />
                )}
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title={t("cases.dashboard.agent-load")}>
                {data.byAssignee.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("cases.dashboard.no-assigned")}</p>
                ) : (
                  <BarList
                    data={data.byAssignee.map((row) => ({
                      key: row.userId,
                      label: userLabel(row.userId),
                      value: row.openCount,
                    }))}
                    onSelect={(assignee) => void navigate(drill({ assignee, listView: "all" }))}
                  />
                )}
              </Panel>
              <Panel title={t("cases.dashboard.due-soon")}>
                {data.dueSoon.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("cases.dashboard.none-due")}</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.dueSoon.map((c) => (
                      <li key={c.id}>
                        <Link
                          to={drill({ caseId: c.id, sla: "due-soon" })}
                          className="flex items-center gap-2 py-2 text-sm hover:text-primary"
                        >
                          <span className="shrink-0 font-mono text-xs text-muted-foreground">
                            {c.caseReferenceId}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{c.title}</span>
                          <PriorityBadge priority={c.priority} variant="compact" />
                          <span
                            className={cn(
                              "shrink-0 text-xs tabular-nums",
                              c.slaState === "WARNING" && "text-warning-text",
                              c.slaState === "BREACHED" && "text-destructive-text",
                            )}
                          >
                            {formatDueIn(c.resolutionDueAt, now) ?? t("cases.dashboard.due-now")}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
