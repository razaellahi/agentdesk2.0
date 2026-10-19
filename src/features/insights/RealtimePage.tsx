import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Copy, Pencil, Plus, Sparkles, Trash2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isFeatureEnabled } from "@/config";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { confirm } from "@/components/common/confirm";
import { useCurrentUser } from "@/core/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { loadDashboard, saveDashboard } from "./dashboard/api";
import { AiWidgetDialog } from "./dashboard/AiWidgetDialog";
import { WidgetBuilder } from "./dashboard/WidgetBuilder";
import { WidgetView } from "./dashboard/WidgetView";
import { cn } from "@/shared/lib/utils";
import type { Dashboard, Widget, WidgetConfig } from "./dashboard/model";
export default function RealtimePage() {
  const user = useCurrentUser();
  return user ? <DashboardEditor key={user.id} userId={user.id} /> : null;
}
function DashboardEditor({ userId }: { userId: string }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["dashboard-layout", userId],
    queryFn: () => loadDashboard(userId),
    staleTime: Infinity,
  });
  const [edited, setEdited] = useState<Dashboard | null>(null);
  const { t } = useTranslation();
  const [builder, setBuilder] = useState<"new" | Widget | null>(null);
  const [ai, setAi] = useState(false);
  /** An AI-generated config opened in the builder for refinement before it is added. */
  const [refining, setRefining] = useState<WidgetConfig | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  useUnsavedChanges(Boolean(edited));
  const save = useMutation({
    mutationFn: (layout: Dashboard) => saveDashboard(userId, layout),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_response, layout) => {
      client.setQueryData(["dashboard-layout", userId], layout);
      setEdited((current) => (current === layout ? null : current));
      toast.success("Dashboard saved");
    },
  });
  const dashboard = edited ?? query.data;
  if (query.isPending)
    return (
      <div className="p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (!dashboard)
    return (
      <div role="alert" className="p-6 text-destructive-text">
        {query.error?.message}
        <Button className="ms-3" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  const tab = dashboard.tabs.find((t) => t.id === dashboard.activeTabId) ?? dashboard.tabs[0]!;
  const patch = (value: Partial<Dashboard>) => setEdited({ ...dashboard, ...value });
  const widgets = (next: Widget[]) =>
    patch({ tabs: dashboard.tabs.map((t) => (t.id === tab.id ? { ...t, widgets: next } : t)) });
  const reorder = (id: string, offset: number) => {
    const next = [...tab.widgets];
    const from = next.findIndex((w) => w.id === id);
    const target = from + offset;
    if (target < 0 || target >= next.length) return;
    const [widget] = next.splice(from, 1);
    next.splice(target, 0, widget!);
    widgets(next.map((w, i) => ({ ...w, x: 0, y: i })));
  };
  const addWidget = (config: WidgetConfig) =>
    widgets([
      ...tab.widgets,
      {
        id: crypto.randomUUID(),
        config,
        cols: config.visualizationType === "TABLE" ? 8 : 4,
        rows: 3,
        x: 0,
        y: tab.widgets.length,
      },
    ]);
  const saveWidget = (config: WidgetConfig) => {
    if (builder === "new") addWidget(config);
    else widgets(tab.widgets.map((w) => (w.id === builder?.id ? { ...w, config } : w)));
    setBuilder(null);
  };
  return (
    <div className="flex min-h-full flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Build a view of the queues, agents and channels you manage.
        </p>
        <div className="flex gap-2">
          {isFeatureEnabled("aiWidgetGenerator") && (
            <Button
              variant="outline"
              onClick={() => setAi(true)}
              title={t("dashboard.page.generate-widget-tooltip")}
            >
              <Sparkles className="size-4" />
              {t("dashboard.page.ai-assistant")}
            </Button>
          )}
          <Button variant="outline" onClick={() => setBuilder("new")}>
            <Plus className="size-4" />
            Add widget
          </Button>
          <Button disabled={!edited || save.isPending} onClick={() => save.mutate(dashboard)}>
            Save dashboard
          </Button>
        </div>
      </header>
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <div role="tablist" aria-label="Dashboards" className="flex flex-1 flex-wrap gap-1">
          {dashboard.tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab.id === t.id}
              className={cn(
                "rounded-full border px-3.5 py-1 text-xs font-medium transition-colors",
                tab.id === t.id
                  ? "bg-primary-lt border-primary/30 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              )}
              onClick={() => patch({ activeTabId: t.id })}
            >
              {t.name}
            </button>
          ))}
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label="Add dashboard tab"
            onClick={() => {
              const t = {
                id: crypto.randomUUID(),
                name: `Dashboard ${dashboard.tabs.length + 1}`,
                widgets: [],
              };
              patch({ tabs: [...dashboard.tabs, t], activeTabId: t.id });
            }}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs">
          Refresh
          <select
            className="h-8 rounded-md border bg-surface px-2"
            value={dashboard.refreshIntervalSec ?? 10}
            onChange={(e) => patch({ refreshIntervalSec: Number(e.target.value) })}
          >
            {[3, 5, 10, 15, 20].map((s) => (
              <option key={s} value={s}>
                {s}s
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Input
          aria-label="Dashboard tab name"
          value={tab.name}
          onChange={(e) =>
            patch({ tabs: dashboard.tabs.map((t) => (t.id === tab.id ? { ...t, name: e.target.value } : t)) })
          }
          className="w-48"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Duplicate dashboard"
          onClick={() => {
            const copy = {
              ...structuredClone(tab),
              id: crypto.randomUUID(),
              name: `${tab.name} copy`,
              widgets: tab.widgets.map((w) => ({ ...structuredClone(w), id: crypto.randomUUID() })),
            };
            patch({ tabs: [...dashboard.tabs, copy], activeTabId: copy.id });
          }}
        >
          <Copy />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={dashboard.tabs.length <= 1}
          aria-label="Delete dashboard"
          onClick={async () => {
            if (await confirm({ title: `Delete ${tab.name}?`, destructive: true })) {
              const tabs = dashboard.tabs.filter((t) => t.id !== tab.id);
              patch({ tabs, activeTabId: tabs[0]!.id });
            }
          }}
        >
          <Trash2 />
        </Button>
        <span className="ms-auto text-xs text-muted-foreground">
          {edited ? "Unsaved changes" : "Saved layout"}
        </span>
      </div>
      {!tab.widgets.length && (
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-surface">
          <div className="text-center">
            <p className="font-medium">Create your first widget</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a metric, filters and a visualization.
            </p>
            <Button className="mt-4" onClick={() => setBuilder("new")}>
              Add widget
            </Button>
          </div>
        </div>
      )}
      <div className="dashboard-grid" role="tabpanel" aria-label={tab.name}>
        {tab.widgets.map((widget, index) => (
          <article
            key={widget.id}
            className="min-w-0 overflow-hidden rounded-xl border bg-surface shadow-soft"
            style={{
              gridColumn: `span ${Math.max(2, Math.min(8, widget.cols))}`,
              minHeight: Math.max(2, widget.rows) * 70,
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (!dragId || dragId === widget.id) return;
              const source = tab.widgets.findIndex((w) => w.id === dragId);
              reorder(dragId, index - source);
              setDragId(null);
            }}
          >
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <button
                draggable
                onDragStart={() => setDragId(widget.id)}
                onDragEnd={() => setDragId(null)}
                aria-label={`Move ${widget.config.title}`}
                className="min-w-0 flex-1 cursor-grab truncate text-start text-sm font-medium"
              >
                {widget.config.title}
              </button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Move widget left"
                disabled={index === 0}
                onClick={() => reorder(widget.id, -1)}
              >
                <ArrowLeft />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Move widget right"
                disabled={index === tab.widgets.length - 1}
                onClick={() => reorder(widget.id, 1)}
              >
                <ArrowRight />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Edit widget"
                onClick={() => setBuilder(widget)}
              >
                <Pencil />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Delete widget"
                onClick={() => widgets(tab.widgets.filter((w) => w.id !== widget.id))}
              >
                <Trash2 />
              </Button>
            </div>
            <WidgetView config={widget.config} interval={dashboard.refreshIntervalSec ?? 10} />
            <div className="flex justify-between border-t px-3 py-1 text-xs text-muted-foreground">
              <label className="flex items-center gap-1">
                Width
                <select
                  aria-label="Widget width"
                  className="bg-transparent"
                  value={widget.cols}
                  onChange={(e) =>
                    widgets(
                      tab.widgets.map((w) =>
                        w.id === widget.id ? { ...w, cols: Number(e.target.value) } : w,
                      ),
                    )
                  }
                >
                  {[2, 4, 6, 8].map((cols) => (
                    <option key={cols} value={cols}>
                      {cols}/8
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1">
                Height
                <select
                  aria-label="Widget height"
                  className="bg-transparent"
                  value={widget.rows}
                  onChange={(e) =>
                    widgets(
                      tab.widgets.map((w) =>
                        w.id === widget.id ? { ...w, rows: Number(e.target.value) } : w,
                      ),
                    )
                  }
                >
                  {[2, 3, 4, 5, 6].map((rows) => (
                    <option key={rows} value={rows}>
                      {rows}
                    </option>
                  ))}
                </select>
              </label>
              <span className="flex items-center gap-1">
                <RefreshCw className="size-3" />
                {dashboard.refreshIntervalSec ?? 10}s
              </span>
            </div>
          </article>
        ))}
      </div>
      {builder && (
        <WidgetBuilder
          initial={builder === "new" ? undefined : builder.config}
          onClose={() => setBuilder(null)}
          onSave={saveWidget}
        />
      )}
      {ai && (
        <AiWidgetDialog
          onClose={() => setAi(false)}
          onDeploy={(config) => {
            addWidget(config);
            setAi(false);
          }}
          onRefine={(config) => {
            setAi(false);
            setRefining(config);
          }}
        />
      )}
      {refining && (
        <WidgetBuilder
          initial={refining}
          onClose={() => setRefining(null)}
          onSave={(config) => {
            addWidget(config);
            setRefining(null);
          }}
        />
      )}
    </div>
  );
}
