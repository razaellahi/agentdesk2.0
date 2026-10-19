import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, LayoutDashboard, Loader2, RefreshCw, Rows3 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { exportReportCsv, fetchReports, type CountByLabel } from "../api";
import { useUserLabel } from "../hooks/useDisplayNames";
import { workbenchLink, type DrillParams } from "../model/drill";
import { formatMinutes } from "../model/format";
import { periodFilter, type Period } from "../model/reportRange";
import { PeriodFilter } from "./PeriodFilter";

type Tab = "workload" | "sla" | "intake" | "recurrence" | "throughput";
const TABS: Tab[] = ["workload", "sla", "intake", "recurrence", "throughput"];

function Kpi({
  label,
  value,
  to,
  tone,
}: {
  label: string;
  value: ReactNode;
  to?: string;
  tone?: "warn" | "danger";
}) {
  const body = (
    <>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "mt-1 block text-2xl font-semibold tabular-nums",
          tone === "warn" && "text-warning-text",
          tone === "danger" && "text-destructive-text",
        )}
      >
        {value}
      </span>
    </>
  );
  const className = "block rounded-2xl border border-border bg-surface p-4";
  return to ? (
    <Link to={to} className={cn(className, "hover:border-primary/60")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Table({
  title,
  head,
  rows,
}: {
  title: string;
  head: string[];
  rows: { key: string; cells: ReactNode[] }[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              {head.map((h, i) => (
                <th key={h} className={cn("py-2 font-medium", i === 0 ? "text-start" : "text-end")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/60 last:border-0">
                {row.cells.map((cell, i) => (
                  <td key={i} className={cn("py-1.5", i === 0 ? "text-start" : "text-end tabular-nums")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Count table whose label cells drill into the Workbench. */
function CountTable({
  title,
  label,
  countLabel,
  data,
  drill,
}: {
  title: string;
  label: string;
  countLabel: string;
  data: CountByLabel[];
  drill?: (key: string) => DrillParams;
}) {
  return (
    <Table
      title={title}
      head={[label, countLabel]}
      rows={data.map((row) => ({
        key: row.key,
        cells: [
          drill ? (
            <Link to={workbenchLink(drill(row.key))} className="text-primary hover:underline">
              {row.label}
            </Link>
          ) : (
            row.label
          ),
          row.count,
        ],
      }))}
    />
  );
}

/** Historical operational reports for supervisors and admins (reports.component.ts). */
export default function ReportsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>({ kind: "preset", days: 30 });
  const [tab, setTab] = useState<Tab>("workload");
  const filter = periodFilter(period)!;
  const reports = useQuery({ queryKey: ["cases", "reports", filter], queryFn: () => fetchReports(filter) });
  const exporting = useMutation({ mutationFn: () => exportReportCsv(tab, filter.dateFrom, filter.dateTo) });

  const { workload, sla, intake, recurrence, throughput } = reports.data ?? {};
  const userLabel = useUserLabel(null, [
    ...(workload?.byAssignee.map((a) => a.userId) ?? []),
    ...(throughput?.byAssignee.map((a) => a.userId) ?? []),
  ]);
  const meta = workload?.meta ?? sla?.meta ?? intake?.meta;
  const metaLine = [
    meta
      ? `${new Date(meta.dateFrom).toLocaleDateString()} – ${new Date(meta.dateTo).toLocaleDateString()}`
      : "",
    throughput?.meta.auditRetentionDays
      ? t("cases.reports.audit-note", { days: throughput.meta.auditRetentionDays })
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const pct = (value: number | null) => (value != null ? `${value}%` : "—");
  const open = t("cases.reports.open");
  const count = t("cases.reports.count");

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{t("nav.cases-reports")}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{t("cases.reports.description")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/cases/dashboard">
                <LayoutDashboard />
                {t("nav.cases-dashboard")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/cases">
                <Rows3 />
                {t("nav.cases-workbench")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void reports.refetch()}>
              <RefreshCw className={cn(reports.isFetching && "animate-spin")} />
              {t("cases.refresh")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting.isPending || reports.isPending}
              onClick={() => exporting.mutate()}
            >
              <Download />
              {exporting.isPending ? t("cases.exporting") : t("cases.export-csv")}
            </Button>
          </div>
        </div>

        <PeriodFilter value={period} onChange={setPeriod} meta={metaLine} />

        <div
          role="tablist"
          aria-label={t("cases.reports.sections")}
          className="flex flex-wrap gap-1 border-b border-border"
        >
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                tab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`cases.reports.tab-${id}`)}
            </button>
          ))}
        </div>

        {(reports.error || exporting.error) && (
          <p role="alert" className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive-text">
            {(reports.error ?? exporting.error)?.message}
          </p>
        )}

        {reports.isPending ? (
          <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("cases.loading")}
          </p>
        ) : (
          <>
            {tab === "workload" && workload && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Kpi label={open} value={workload.openCount} to={workbenchLink({ listView: "all" })} />
                  <Kpi
                    label={t("cases.unassigned")}
                    value={workload.unassignedCount}
                    to={workbenchLink({ listView: "unassigned" })}
                  />
                  <Kpi
                    label={t("cases.reports.due-soon")}
                    value={workload.dueSoonCount}
                    to={workbenchLink({ sla: "due-soon" })}
                    tone="warn"
                  />
                  <Kpi
                    label={t("cases.reports.oldest-open")}
                    value={formatMinutes(workload.oldestOpenAgeMinutes)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <CountTable
                    title={t("cases.reports.by-status")}
                    label={t("cases.status-label")}
                    countLabel={open}
                    data={workload.byStatus}
                    drill={(status) => ({ status })}
                  />
                  <CountTable
                    title={t("cases.reports.by-priority")}
                    label={t("cases.create.priority")}
                    countLabel={open}
                    data={workload.byPriority}
                    drill={(priority) => ({ priority })}
                  />
                  <CountTable
                    title={t("cases.reports.by-group")}
                    label={t("cases.reports.group")}
                    countLabel={open}
                    data={workload.byRoutingGroup}
                    drill={(group) => ({ group })}
                  />
                  <CountTable
                    title={t("cases.reports.by-sla")}
                    label={t("cases.reports.sla")}
                    countLabel={open}
                    data={workload.bySlaState}
                  />
                </div>
                {workload.byAssignee.length > 0 && (
                  <Table
                    title={t("cases.reports.by-assignee")}
                    head={[t("cases.assignee"), open]}
                    rows={workload.byAssignee.map((row) => ({
                      key: row.userId,
                      cells: [
                        <Link
                          key="a"
                          to={workbenchLink({ assignee: row.userId })}
                          className="text-primary hover:underline"
                        >
                          {userLabel(row.userId)}
                        </Link>,
                        row.count,
                      ],
                    }))}
                  />
                )}
              </>
            )}

            {tab === "sla" && sla && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  <Kpi
                    label={t("cases.reports.at-risk-now")}
                    value={sla.currentAtRiskCount}
                    to={workbenchLink({ listView: "at_risk" })}
                    tone="warn"
                  />
                  <Kpi
                    label={t("cases.reports.breached-now")}
                    value={sla.currentBreachedCount}
                    to={workbenchLink({ listView: "breached" })}
                    tone="danger"
                  />
                  <Kpi label={t("cases.reports.resolved-in-sla")} value={sla.resolvedWithinSlaCount} />
                  <Kpi label={t("cases.reports.resolved-after-sla")} value={sla.resolvedAfterSlaCount} />
                  <Kpi label={t("cases.reports.compliance")} value={pct(sla.complianceRatePercent)} />
                  <Kpi
                    label={t("cases.reports.avg-resolution")}
                    value={formatMinutes(sla.averageResolutionMinutes)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <CountTable
                    title={t("cases.reports.breach-priority")}
                    label={t("cases.create.priority")}
                    countLabel={count}
                    data={sla.breachMixByPriority}
                  />
                  <CountTable
                    title={t("cases.reports.breach-tier")}
                    label={t("cases.reports.tier")}
                    countLabel={count}
                    data={sla.breachMixByCustomerTier}
                  />
                </div>
              </>
            )}

            {tab === "intake" && intake && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Kpi label={t("cases.reports.created")} value={intake.createdCount} />
                  <Kpi label={t("cases.reports.linked")} value={intake.interactionLinkedCount} />
                  <Kpi label={t("cases.reports.standalone")} value={intake.standaloneCount} />
                  <Kpi
                    label={t("cases.reports.link-rate")}
                    value={pct(intake.interactionLinkedRatePercent)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <CountTable
                    title={t("cases.reports.by-date")}
                    label={t("cases.reports.date")}
                    countLabel={t("cases.reports.created")}
                    data={intake.byDate}
                  />
                  <CountTable
                    title={t("cases.reports.by-category")}
                    label={t("cases.category")}
                    countLabel={count}
                    data={intake.byCategory}
                  />
                  <CountTable
                    title={t("cases.reports.by-group")}
                    label={t("cases.reports.group")}
                    countLabel={count}
                    data={intake.byRoutingGroup}
                    drill={(group) => ({ group })}
                  />
                  <CountTable
                    title={t("cases.reports.by-priority")}
                    label={t("cases.create.priority")}
                    countLabel={count}
                    data={intake.byPriority}
                  />
                </div>
              </>
            )}

            {tab === "recurrence" && recurrence && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Kpi
                    label={t("cases.reports.repeat-customers")}
                    value={recurrence.customersWithMultipleCases}
                  />
                  <Kpi
                    label={t("cases.reports.recent-window")}
                    value={`${recurrence.recentCasesWindowHours}h`}
                  />
                </div>
                <Table
                  title={t("cases.reports.multiple-cases")}
                  head={[
                    t("cases.customer"),
                    t("cases.reports.tier"),
                    t("cases.reports.cases"),
                    open,
                    t("cases.reports.linked"),
                    t("cases.reports.recent"),
                  ]}
                  rows={recurrence.rows.map((row) => ({
                    key: row.customerProfileId,
                    cells: [
                      row.customerName ?? row.customerProfileId,
                      row.customerTier ?? "—",
                      row.caseCount,
                      row.openCaseCount,
                      row.interactionLinkedCount,
                      row.recentRecurrenceCount,
                    ],
                  }))}
                />
              </>
            )}

            {tab === "throughput" && throughput && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  <Kpi label={t("cases.reports.claims")} value={throughput.totalClaims} />
                  <Kpi label={t("cases.reports.auto-assigned")} value={throughput.totalAutoAssignments} />
                  <Kpi label={t("cases.reports.reassignments")} value={throughput.totalReassignments} />
                  <Kpi label={t("cases.reports.resolutions")} value={throughput.totalResolutions} />
                  <Kpi label={t("cases.reports.reopens")} value={throughput.totalReopens} />
                  <Kpi label={t("cases.reports.closures")} value={throughput.totalClosures} />
                </div>
                <Table
                  title={t("cases.reports.by-group")}
                  head={[
                    t("cases.reports.group"),
                    open,
                    t("cases.reports.claims"),
                    t("cases.reports.resolutions"),
                    t("cases.reports.avg-resolution"),
                  ]}
                  rows={throughput.byRoutingGroup.map((row) => ({
                    key: row.groupKey,
                    cells: [
                      row.groupLabel,
                      row.openLoad,
                      row.claims,
                      row.resolutions,
                      formatMinutes(row.averageResolutionMinutes),
                    ],
                  }))}
                />
                {throughput.byAssignee.length > 0 && (
                  <Table
                    title={t("cases.reports.by-assignee")}
                    head={[
                      t("cases.assignee"),
                      open,
                      t("cases.reports.claims"),
                      t("cases.reports.resolutions"),
                      t("cases.reports.avg-resolution"),
                    ]}
                    rows={throughput.byAssignee.map((row) => ({
                      key: row.userId,
                      cells: [
                        userLabel(row.userId),
                        row.openLoad,
                        row.claims,
                        row.resolutions,
                        formatMinutes(row.averageResolutionMinutes),
                      ],
                    }))}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
