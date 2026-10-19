import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Loader2, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/shared/lib/utils";
import {
  caseKeys,
  createSlaThreshold,
  deleteSlaThreshold,
  fetchSlaThresholds,
  listCimLabels,
  updateSlaThreshold,
  type SlaThreshold,
  type SlaThresholdInput,
} from "../api";
import { PRIORITIES, resolutionShort } from "../model/format";
import { AdminCard, AdminFrame, Banner } from "./AdminFrame";

const PRESETS = [
  { label: "30 min", minutes: 30 },
  { label: "4 h", minutes: 240 },
  { label: "24 h", minutes: 1440 },
  { label: "5 d", minutes: 7200 },
] as const;

const selectClass = "h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm";

/** Tier × priority grid; dashed cells inherit the default (all labels) row. */
export function SlaMatrix({ tiers, thresholds }: { tiers: string[]; thresholds: SlaThreshold[] }) {
  const { t } = useTranslation();
  const index = useMemo(() => {
    const specific = new Map<string, string>();
    const fallback = new Map<string, string>();
    for (const row of thresholds) {
      if (row.customerTier === null) fallback.set(row.priority, row.resolutionLabel);
      else specific.set(`${row.customerTier}::${row.priority}`, row.resolutionLabel);
    }
    return { specific, fallback };
  }, [thresholds]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="py-2 text-start font-medium">{t("cases.admin.sla.tier")}</th>
            {PRIORITIES.map((p) => (
              <th key={p} className="py-2 text-start font-medium">
                {t(`cases.priority.${p.toLowerCase()}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier) => (
            <tr key={tier} className="border-t border-border/60">
              <th scope="row" className="py-2 pe-3 text-start font-medium">
                {tier}
              </th>
              {PRIORITIES.map((p) => {
                const own = index.specific.get(`${tier}::${p}`);
                const inherited = own ? null : index.fallback.get(p);
                return (
                  <td key={p} className="py-1.5 pe-2">
                    <span
                      className={cn(
                        "inline-block rounded-md px-2 py-0.5 text-xs tabular-nums",
                        own && "bg-primary-soft text-primary",
                        inherited && "border border-dashed border-border-strong text-muted-foreground",
                        !own && !inherited && "text-muted-foreground",
                      )}
                    >
                      {own ?? inherited ?? "—"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Draft = { customerTier: string; priority: string; resolutionMinutes: number; warningPercent: number };

const toDraft = (row: SlaThreshold): Draft => ({
  customerTier: row.customerTier ?? "",
  priority: row.priority,
  resolutionMinutes: row.resolutionMinutes,
  warningPercent: row.warningPercent,
});

const toInput = (draft: Draft): SlaThresholdInput => ({
  customerTier: draft.customerTier.trim() || null,
  priority: draft.priority,
  resolutionMinutes: draft.resolutionMinutes,
  warningPercent: draft.warningPercent,
});

/** Resolution matrix by CIM customer label + priority (admin-sla.component.ts). */
export function SlaSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const rows = useQuery({ queryKey: caseKeys.slaThresholds, queryFn: fetchSlaThresholds });
  const labels = useQuery({
    queryKey: ["cases", "cim-labels"],
    queryFn: listCimLabels,
    staleTime: 5 * 60_000,
  });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [fresh, setFresh] = useState<Draft>({
    customerTier: "",
    priority: "Medium",
    resolutionMinutes: 1440,
    warningPercent: 80,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cimLabels = [...(labels.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const thresholds = [...(rows.data ?? [])].sort(
    (a, b) =>
      (a.customerTier ?? "").localeCompare(b.customerTier ?? "") || a.priority.localeCompare(b.priority),
  );
  const tiers = [
    ...new Set([
      ...thresholds.map((r) => r.customerTier).filter((v): v is string => Boolean(v)),
      ...cimLabels.map((l) => l.name),
    ]),
  ].sort((a, b) => a.localeCompare(b));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: caseKeys.slaThresholds });
  };

  const add = useMutation({
    mutationFn: () => createSlaThreshold(toInput(fresh)),
    onMutate: () => setError(null),
    onSuccess: () => {
      setFresh((f) => ({ ...f, customerTier: "" }));
      refresh();
    },
    onError: (cause: Error) => setError(cause.message),
  });

  const save = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: Draft }) => updateSlaThreshold(id, toInput(draft)),
    onMutate: ({ id }) => {
      setError(null);
      setBusyId(id);
    },
    onSettled: () => setBusyId(null),
    onSuccess: (_row, { id }) => {
      setDrafts(({ [id]: _done, ...rest }) => rest);
      refresh();
    },
    onError: (cause: Error) => setError(cause.message),
  });

  const remove = useMutation({
    mutationFn: deleteSlaThreshold,
    onMutate: (id) => {
      setError(null);
      setBusyId(id);
    },
    onSettled: () => setBusyId(null),
    onSuccess: refresh,
    onError: (cause: Error) => setError(cause.message),
  });

  const tierOptions = (
    <>
      <option value="">{t("cases.admin.sla.default-tier")}</option>
      {cimLabels.map((l) => (
        <option key={l._id} value={l.name}>
          {l.name}
        </option>
      ))}
    </>
  );
  const priorityOptions = PRIORITIES.map((p) => (
    <option key={p} value={p}>
      {t(`cases.priority.${p.toLowerCase()}`)}
    </option>
  ));

  return (
    <AdminFrame title={t("cases.admin.sla.title")} description={t("cases.admin.sla.description")}>
      {(error || rows.error) && <Banner tone="error">{error ?? rows.error?.message}</Banner>}
      <Banner tone="info">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <strong>{t("cases.admin.sla.lookup-title")}</strong>
          <p className="text-muted-foreground">{t("cases.admin.sla.lookup")}</p>
        </div>
      </Banner>
      {rows.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("cases.loading")}
        </p>
      ) : (
        <>
          {tiers.length > 0 && (
            <AdminCard title={t("cases.admin.sla.glance")} hint={t("cases.admin.sla.glance-hint")}>
              <SlaMatrix tiers={tiers} thresholds={thresholds} />
            </AdminCard>
          )}
          <AdminCard title={t("cases.admin.sla.add")} hint={t("cases.admin.sla.add-hint")}>
            {labels.isError && (
              <p className="text-xs text-warning-text">{t("cases.admin.sla.labels-failed")}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-5 sm:items-end">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="sla-new-tier">{t("cases.admin.sla.customer-label")}</Label>
                <select
                  id="sla-new-tier"
                  className={selectClass}
                  value={fresh.customerTier}
                  onChange={(e) => setFresh((f) => ({ ...f, customerTier: e.target.value }))}
                >
                  {tierOptions}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sla-new-priority">{t("cases.create.priority")}</Label>
                <select
                  id="sla-new-priority"
                  className={selectClass}
                  value={fresh.priority}
                  onChange={(e) => setFresh((f) => ({ ...f, priority: e.target.value }))}
                >
                  {priorityOptions}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sla-new-minutes">{t("cases.admin.sla.resolution-minutes")}</Label>
                <Input
                  id="sla-new-minutes"
                  type="number"
                  min={1}
                  value={fresh.resolutionMinutes}
                  onChange={(e) => setFresh((f) => ({ ...f, resolutionMinutes: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sla-new-warning">{t("cases.admin.sla.warning-percent")}</Label>
                <Input
                  id="sla-new-warning"
                  type="number"
                  min={1}
                  max={99}
                  value={fresh.warningPercent}
                  onChange={(e) => setFresh((f) => ({ ...f, warningPercent: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("cases.admin.sla.quick")}</span>
              {PRESETS.map((preset) => (
                <Button
                  key={preset.minutes}
                  size="xs"
                  variant={fresh.resolutionMinutes === preset.minutes ? "secondary" : "outline"}
                  onClick={() => setFresh((f) => ({ ...f, resolutionMinutes: preset.minutes }))}
                >
                  {preset.label}
                </Button>
              ))}
              <Button className="ms-auto" disabled={add.isPending} onClick={() => add.mutate()}>
                {t("cases.admin.sla.add-row")}
              </Button>
            </div>
          </AdminCard>
          <AdminCard title={t("cases.admin.sla.matrix", { count: thresholds.length })}>
            {thresholds.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("cases.admin.sla.empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="py-2 text-start font-medium">{t("cases.admin.sla.customer-label")}</th>
                      <th className="py-2 text-start font-medium">{t("cases.create.priority")}</th>
                      <th className="py-2 text-start font-medium">{t("cases.admin.sla.resolution")}</th>
                      <th className="py-2 text-start font-medium">{t("cases.admin.sla.warning-percent")}</th>
                      <th className="py-2 text-start font-medium">{t("cases.admin.sla.preview")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {thresholds.map((row) => {
                      const draft = drafts[row.id] ?? toDraft(row);
                      const edit = (patch: Partial<Draft>) =>
                        setDrafts((d) => ({ ...d, [row.id]: { ...draft, ...patch } }));
                      return (
                        <tr key={row.id} className="border-b border-border/60">
                          <td className="py-1.5 pe-2">
                            <select
                              className={selectClass}
                              value={draft.customerTier}
                              aria-label={t("cases.admin.sla.customer-label-row", { id: row.id })}
                              onChange={(e) => edit({ customerTier: e.target.value })}
                            >
                              {tierOptions}
                            </select>
                          </td>
                          <td className="py-1.5 pe-2">
                            <select
                              className={selectClass}
                              value={draft.priority}
                              aria-label={t("cases.admin.sla.priority-row", { id: row.id })}
                              onChange={(e) => edit({ priority: e.target.value })}
                            >
                              {priorityOptions}
                            </select>
                          </td>
                          <td className="w-28 py-1.5 pe-2">
                            <Input
                              type="number"
                              min={1}
                              className="h-9"
                              value={draft.resolutionMinutes}
                              aria-label={t("cases.admin.sla.minutes-row", { id: row.id })}
                              onChange={(e) => edit({ resolutionMinutes: Number(e.target.value) })}
                            />
                          </td>
                          <td className="w-24 py-1.5 pe-2">
                            <Input
                              type="number"
                              min={1}
                              max={99}
                              className="h-9"
                              value={draft.warningPercent}
                              aria-label={t("cases.admin.sla.warning-row", { id: row.id })}
                              onChange={(e) => edit({ warningPercent: Number(e.target.value) })}
                            />
                          </td>
                          <td className="py-1.5 pe-2 text-xs text-muted-foreground tabular-nums">
                            {resolutionShort(draft.resolutionMinutes)
                              ? t("cases.admin.sla.preview-value", {
                                  duration: resolutionShort(draft.resolutionMinutes),
                                  percent: draft.warningPercent,
                                })
                              : "—"}
                          </td>
                          <td className="py-1.5 text-end whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("cases.save")}
                              disabled={busyId === row.id}
                              onClick={() => save.mutate({ id: row.id, draft })}
                            >
                              {busyId === row.id && save.isPending ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <Save />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("cases.delete")}
                              disabled={busyId === row.id}
                              onClick={async () => {
                                const ok = await confirm({
                                  title: t("cases.admin.sla.delete-title", {
                                    priority: draft.priority,
                                    tier: draft.customerTier.trim() || t("cases.admin.sla.default-short"),
                                  }),
                                  destructive: true,
                                  confirmLabel: t("cases.delete"),
                                });
                                if (ok) remove.mutate(row.id);
                              }}
                            >
                              <Trash2 />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        </>
      )}
    </AdminFrame>
  );
}
