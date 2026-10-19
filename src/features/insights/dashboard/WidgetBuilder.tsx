import { useState, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { METRIC_METADATA } from "./metrics";
import {
  Category,
  DYNAMIC_PLACEHOLDERS as D,
  type WidgetConfig,
  type Threshold,
  type VisualizationType,
} from "./model";
import { dashboardOptions } from "./api";
import { WidgetView } from "./WidgetView";
const SELECT = "h-9 w-full rounded-md border bg-surface px-2 text-sm";
export function WidgetBuilder({
  initial,
  onSave,
  onClose,
}: {
  initial?: WidgetConfig;
  onSave: (config: WidgetConfig) => void;
  onClose: () => void;
}) {
  const formId = useId();
  const [draft, setDraft] = useState<WidgetConfig>(
    initial ?? {
      title: "Service level",
      category: "QUEUES",
      metric: "SLA",
      visualizationType: "KPI",
      settings: {
        teamId: D.CURRENT_TEAM,
        queueIds: [D.ALL_QUEUES],
        agentId: D.CURRENT_AGENT,
        mrdId: D.ALL_MRDS,
        botId: D.ALL_BOTS,
      },
    },
  );
  const [fieldText, setFieldText] = useState(initial?.settings?.selectedMetricFields?.join(", ") ?? "");
  const [preview, setPreview] = useState<WidgetConfig | null>(null);
  const options = useQuery({
    queryKey: ["dashboard-options", draft.settings?.teamId],
    queryFn: ({ signal }) => dashboardOptions(draft.settings?.teamId, signal),
  });
  const update = (patch: Partial<WidgetConfig>) => setDraft((d) => ({ ...d, ...patch }));
  const settings = (patch: NonNullable<WidgetConfig["settings"]>) =>
    setDraft((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const metadata = METRIC_METADATA[draft.category];
  const selectedMetric = metadata.find((m) => m.id === draft.metric);
  const thresholds = draft.settings?.thresholds ?? [];
  const threshold = (index: number, patch: Partial<Threshold>) =>
    settings({ thresholds: thresholds.map((t, i) => (i === index ? { ...t, ...patch } : t)) });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit widget" : "Add widget"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor={`${formId}-title`} className="space-y-1 text-xs font-medium">
            Title
            <Input
              id={`${formId}-title`}
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>
          <label className="space-y-1 text-xs font-medium">
            Category
            <select
              className={SELECT}
              value={draft.category}
              onChange={(e) => {
                const category = e.target.value as Category;
                const metric = METRIC_METADATA[category][0]!;
                update({ category, metric: metric.id, visualizationType: metric.supportedVisuals[0]! });
              }}
            >
              {Object.values(Category).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium">
            Metric
            <select
              className={SELECT}
              value={draft.metric}
              onChange={(e) => {
                const metric = metadata.find((m) => m.id === e.target.value)!;
                update({
                  metric: metric.id,
                  visualizationType: metric.supportedVisuals.includes(draft.visualizationType)
                    ? draft.visualizationType
                    : metric.supportedVisuals[0]!,
                });
              }}
            >
              {metadata.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium">
            Visualization
            <select
              className={SELECT}
              value={draft.visualizationType}
              onChange={(e) => update({ visualizationType: e.target.value as VisualizationType })}
            >
              {selectedMetric?.supportedVisuals.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium">
            Team
            <select
              className={SELECT}
              value={draft.settings?.teamId ?? D.CURRENT_TEAM}
              onChange={(e) => settings({ teamId: e.target.value, queueIds: [D.ALL_QUEUES], queueNames: [] })}
            >
              <option value={D.CURRENT_TEAM}>Current team</option>
              {options.data?.teams.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          {draft.category === "AGENTS" && (
            <label htmlFor={`${formId}-agent`} className="space-y-1 text-xs font-medium">
              Agent ID
              <Input
                id={`${formId}-agent`}
                value={draft.settings?.agentId ?? D.CURRENT_AGENT}
                onChange={(e) => settings({ agentId: e.target.value })}
              />
            </label>
          )}
          {draft.category === "QUEUES" && (
            <label className="space-y-1 text-xs font-medium">
              Queues
              <select
                multiple
                className="w-full rounded-md border bg-surface p-2"
                value={draft.settings?.queueIds ?? []}
                onChange={(e) => settings({ queueIds: [...e.target.selectedOptions].map((o) => o.value) })}
              >
                <option value={D.ALL_QUEUES}>All queues</option>
                {options.data?.queues.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {draft.category === "CONVERSATIONS" && (
            <label className="space-y-1 text-xs font-medium">
              Channel
              <select
                className={SELECT}
                value={draft.settings?.mrdId ?? D.ALL_MRDS}
                onChange={(e) => settings({ mrdId: e.target.value })}
              >
                <option value={D.ALL_MRDS}>All channels</option>
                {options.data?.mrds.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {draft.category === "BOTS" && (
            <label className="space-y-1 text-xs font-medium">
              Bot
              <select
                className={SELECT}
                value={draft.settings?.botId ?? D.ALL_BOTS}
                onChange={(e) => settings({ botId: e.target.value })}
              >
                <option value={D.ALL_BOTS}>All bots</option>
                {options.data?.bots.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {draft.category === "TEAMS" && (
            <label className="space-y-1 text-xs font-medium">
              Teams
              <select
                multiple
                className="w-full rounded-md border bg-surface p-2"
                value={draft.settings?.teamIds ?? [D.CURRENT_TEAM]}
                onChange={(e) => settings({ teamIds: [...e.target.selectedOptions].map((o) => o.value) })}
              >
                <option value={D.CURRENT_TEAM}>Current team</option>
                {options.data?.teams.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label htmlFor={`${formId}-primary`} className="space-y-1 text-xs font-medium">
            Primary metric field
            <Input
              id={`${formId}-primary`}
              value={draft.settings?.primaryMetricField ?? ""}
              onChange={(e) => settings({ primaryMetricField: e.target.value })}
              placeholder="Automatic"
            />
          </label>
          <label htmlFor={`${formId}-fields`} className="space-y-1 text-xs font-medium">
            Visible fields (comma separated)
            <Input
              id={`${formId}-fields`}
              value={fieldText}
              onChange={(e) => {
                setFieldText(e.target.value);
                settings({
                  selectedMetricFields: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                });
              }}
              placeholder="All fields"
            />
          </label>
        </div>
        {options.isError && (
          <p role="alert" className="text-xs text-destructive-text">
            {options.error.message}
            <Button variant="ghost" size="sm" onClick={() => void options.refetch()}>
              Retry filters
            </Button>
          </p>
        )}
        {options.data?.warnings.length ? (
          <p role="alert" className="text-xs text-warning">
            Some filters could not load: {options.data.warnings.join("; ")}
          </p>
        ) : null}
        <fieldset className="space-y-2 rounded-lg border p-3">
          <legend className="px-1 text-xs font-medium">Thresholds</legend>
          {thresholds.map((t, i) => (
            <div key={i} className="flex gap-2">
              <select
                aria-label="Threshold operator"
                className={SELECT}
                value={t.operator}
                onChange={(e) => threshold(i, { operator: e.target.value as Threshold["operator"] })}
              >
                {[">", ">=", "<", "<=", "=="].map((op) => (
                  <option key={op}>{op}</option>
                ))}
              </select>
              <Input
                aria-label="Threshold value"
                type="number"
                value={t.value}
                onChange={(e) => threshold(i, { value: Number(e.target.value) })}
              />
              <select
                className={SELECT}
                aria-label="Threshold color"
                value={t.color}
                onChange={(e) => threshold(i, { color: e.target.value })}
              >
                {["success", "warn", "error", "primary"].map((c) => (
                  <option key={c} value={`var(--${c})`}>
                    {c}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => settings({ thresholds: thresholds.filter((_, n) => n !== i) })}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              settings({
                thresholds: [...thresholds, { value: 80, operator: ">=", color: "var(--success)" }],
              })
            }
          >
            Add threshold
          </Button>
        </fieldset>
        {preview && (
          <div className="rounded-lg border">
            <WidgetView config={preview} interval={20} />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => setPreview(structuredClone(draft))}>
            Preview
          </Button>
          <Button
            disabled={
              !draft.title.trim() ||
              !selectedMetric ||
              !selectedMetric.supportedVisuals.includes(draft.visualizationType)
            }
            onClick={() => onSave(draft)}
          >
            Save widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
