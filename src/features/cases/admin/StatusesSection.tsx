import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/shared/lib/utils";
import {
  createCaseStatus,
  deactivateCaseStatus,
  deactivateStatusTransition,
  fetchStatusesPage,
  updateCaseStatus,
  upsertStatusTransition,
} from "../api";
import { AdminCard, AdminFrame, Banner } from "./AdminFrame";

const KEY = ["cases", "admin", "statuses"] as const;
const CATEGORIES = ["OPEN", "PENDING", "RESOLVED", "CLOSED"] as const;

const selectClass = "h-9 rounded-lg border border-border bg-surface px-2 text-sm";

/** Workflow statuses, SLA pause rules and allowed transitions (admin-statuses.component.ts). */
export function StatusesSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"statuses" | "transitions">("statuses");
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState<string>("PENDING");
  const [newPausesSla, setNewPausesSla] = useState(true);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const page = useQuery({ queryKey: KEY, queryFn: fetchStatusesPage });
  const statuses = page.data?.adminCaseStatuses ?? [];
  const transitions = page.data?.adminStatusTransitions ?? [];

  const run = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onMutate: () => {
      setError(null);
      setBanner(null);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      void queryClient.invalidateQueries({ queryKey: ["cases", "transitions"] });
    },
    onError: (cause: Error) => setError(cause.message),
  });

  const createStatus = () => {
    const label = newLabel.trim();
    if (!label) return;
    run.mutate(() => createCaseStatus({ label, statusCategory: newCategory, pausesSla: newPausesSla }), {
      onSuccess: () => {
        setNewLabel("");
        setBanner(t("cases.admin.statuses.created"));
      },
    });
  };

  const tabs = [
    { id: "statuses" as const, label: t("cases.admin.statuses.tab-statuses") },
    { id: "transitions" as const, label: t("cases.admin.statuses.tab-transitions") },
  ];

  return (
    <AdminFrame
      title={t("cases.admin.statuses.title")}
      description={t("cases.admin.statuses.description")}
      actions={
        <Button variant="outline" size="sm" onClick={() => void page.refetch()}>
          <RefreshCw className={cn(page.isFetching && "animate-spin")} />
          {t("cases.refresh")}
        </Button>
      }
    >
      {(error || page.error) && <Banner tone="error">{error ?? page.error?.message}</Banner>}
      {banner && <Banner tone="success">{banner}</Banner>}
      <div role="tablist" className="flex gap-1 border-b border-border">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {page.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("cases.loading")}
        </p>
      ) : tab === "statuses" ? (
        <AdminCard title={t("cases.admin.statuses.add")}>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder={t("cases.admin.statuses.label")}
              aria-label={t("cases.admin.statuses.new-label")}
              className="w-56"
            />
            <select
              className={selectClass}
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              aria-label={t("cases.admin.statuses.new-category")}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`cases.category-${c.toLowerCase()}`)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={newPausesSla} onCheckedChange={setNewPausesSla} />{" "}
              {t("cases.admin.statuses.pauses-sla")}
            </label>
            <Button onClick={createStatus} disabled={run.isPending || !newLabel.trim()}>
              {t("cases.add")}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs text-muted-foreground">
                  <th className="py-2 text-start font-medium">{t("cases.admin.statuses.label")}</th>
                  <th className="py-2 text-start font-medium">{t("cases.admin.statuses.code")}</th>
                  <th className="py-2 text-start font-medium">{t("cases.admin.statuses.category")}</th>
                  <th className="py-2 text-start font-medium">{t("cases.admin.statuses.pause-sla")}</th>
                  <th className="py-2 text-start font-medium">{t("cases.admin.active")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {statuses.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="py-1.5 pe-2">
                      <Input
                        key={`${s.id}:${s.label}`}
                        defaultValue={s.label}
                        disabled={!s.isActive}
                        aria-label={t("cases.admin.statuses.label-for", { code: s.code })}
                        className="h-8"
                        onBlur={(event) => {
                          const label = event.target.value.trim();
                          if (label && label !== s.label) run.mutate(() => updateCaseStatus(s.id, { label }));
                        }}
                      />
                    </td>
                    <td className="py-1.5 pe-2">
                      <code className="text-xs">{s.code}</code>
                    </td>
                    <td className="py-1.5 pe-2 text-xs">{s.statusCategory}</td>
                    <td className="py-1.5 pe-2" data-testid="pause-sla-toggle">
                      <Switch
                        checked={s.pausesSla}
                        aria-label={t("cases.admin.statuses.pauses-sla-for", { label: s.label })}
                        onCheckedChange={(pausesSla) =>
                          run.mutate(() => updateCaseStatus(s.id, { pausesSla }))
                        }
                      />
                    </td>
                    <td className="py-1.5 pe-2 text-xs">{s.isActive ? t("cases.yes") : t("cases.no")}</td>
                    <td className="py-1.5 text-end">
                      {!s.isSystem && s.isActive && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => run.mutate(() => deactivateCaseStatus(s.id))}
                        >
                          {t("cases.admin.deactivate")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      ) : (
        <AdminCard title={t("cases.admin.statuses.add-transition")}>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={selectClass}
              value={fromId}
              onChange={(event) => setFromId(event.target.value)}
              aria-label={t("cases.admin.statuses.from")}
            >
              <option value="">{t("cases.admin.statuses.from-placeholder")}</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <span aria-hidden>→</span>
            <select
              className={selectClass}
              value={toId}
              onChange={(event) => setToId(event.target.value)}
              aria-label={t("cases.admin.statuses.to")}
            >
              <option value="">{t("cases.admin.statuses.to-placeholder")}</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button
              disabled={!fromId || !toId || run.isPending}
              onClick={() =>
                run.mutate(() => upsertStatusTransition(fromId, toId), {
                  onSuccess: () => {
                    setFromId("");
                    setToId("");
                  },
                })
              }
            >
              {t("cases.add")}
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 text-start font-medium">{t("cases.admin.statuses.from")}</th>
                <th className="py-2 text-start font-medium">{t("cases.admin.statuses.to")}</th>
                <th className="py-2 text-start font-medium">{t("cases.admin.active")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {transitions.map((tr) => (
                <tr key={tr.id} className="border-b border-border/60">
                  <td className="py-2">{tr.fromStatus.label}</td>
                  <td className="py-2">{tr.toStatus.label}</td>
                  <td className="py-2 text-xs">{tr.isActive ? t("cases.yes") : t("cases.no")}</td>
                  <td className="py-2 text-end">
                    {tr.isActive && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => run.mutate(() => deactivateStatusTransition(tr.id))}
                      >
                        {t("cases.admin.disable")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}
    </AdminFrame>
  );
}
