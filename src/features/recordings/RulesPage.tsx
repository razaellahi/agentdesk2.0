import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm";
import { DataTable, DataView, EmptyRow, Td, Th } from "@/components/common/DataView";
import { EmptyState } from "@/components/common/ListChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RuleEditor } from "./RuleEditor";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createRule, updateRule, deleteRule, listRules, saveRulePriorities, type RecordingRule } from "./api";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export default function RulesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["recording-rules"], queryFn: listRules });
  const [rows, setRows] = useState<RecordingRule[] | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [editing, setEditing] = useState<RecordingRule | "new" | null>(null);
  const list = rows ?? query.data ?? [];

  const refresh = async () => {
    setRows(null);
    await queryClient.invalidateQueries({ queryKey: ["recording-rules"] });
  };

  const persist = useMutation({
    mutationFn: (next: { id: number; priority: number }[]) => saveRulePriorities(next),
    onSuccess: async () => {
      toast.success(t("snackbar.SORT-ORDER-UPDATED-SUCCESSFULLY"));
      await refresh();
    },
    onError: (error: Error) => {
      setRows(null);
      toast.error(error.message);
    },
  });

  const save = useMutation({
    mutationFn: (rule: RecordingRule) => (rule.id ? updateRule(rule) : createRule(rule)),
    onSuccess: async () => {
      setEditing(null);
      toast.success("Recording rule saved");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const drop = (targetId: number, sourceId = dragId) => {
    if (persist.isPending || sourceId == null || sourceId === targetId) return;
    const from = list.findIndex((rule) => rule.id === sourceId);
    const to = list.findIndex((rule) => rule.id === targetId);
    if (from < 0 || to < 0) return;
    const slots = list.map((rule, index) => rule.priority ?? index + 1);
    const next = [...list];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    const reordered = next.map((rule, index) => ({ ...rule, priority: slots[index] ?? index + 1 }));
    const changed = reordered
      .filter(
        (rule, index) =>
          rule.priority !== (list[index]?.priority ?? index + 1) || rule.id !== list[index]?.id,
      )
      .map((rule) => ({ id: rule.id, priority: rule.priority ?? 0 }));
    setDragId(null);
    setRows(reordered);
    if (changed.length > 0) persist.mutate(changed);
  };

  return (
    <DataView
      toolbar={
        <div className="flex w-full items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Rules run in priority order. Drag a row or use the arrow buttons.
          </p>
          <Button onClick={() => setEditing("new")}>
            <Plus />
            {t("labels.create")}
          </Button>
        </div>
      }
    >
      {query.isError && (
        <p role="alert" className="p-4 text-destructive">
          {query.error.message}
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {editing && (
        <RuleEditor
          key={editing === "new" ? "new" : editing.id}
          rule={editing === "new" ? null : editing}
          busy={save.isPending}
          onSave={(rule) => save.mutate(rule)}
          onClose={() => setEditing(null)}
        />
      )}
      <DataTable>
        <thead>
          <tr>
            <Th>{t("recordings.priority")}</Th>
            <Th>{t("recordings.action")}</Th>
            <Th>Type / screen capture</Th>
            <Th>{t("recordings.mask")}</Th>
            <Th>{t("recordings.days")}</Th>
            <Th>{t("recordings.from")}</Th>
            <Th>{t("recordings.to")}</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <EmptyRow>
              <EmptyState
                icon={GripVertical}
                title={query.isLoading ? t("globals.loading") : t("recordings.empty")}
              />
            </EmptyRow>
          )}
          {list.map((rule, index) => (
            <tr
              key={rule.id}
              draggable={!persist.isPending}
              onDragEnd={() => setDragId(null)}
              onDragStart={() => setDragId(rule.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => drop(rule.id)}
              className={dragId === rule.id ? "bg-primary-soft" : undefined}
            >
              <Td>
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="size-4 cursor-grab" />
                  <span className="font-medium text-foreground tabular-nums">{index + 1}</span>
                </span>
              </Td>
              <Td>
                <Badge variant="secondary">{rule.ruleAction}</Badge>
              </Td>
              <Td>
                {rule.ruleType}
                <span className="block text-xs text-muted-foreground">
                  {rule.screenCapture ? `Screen capture ${rule.screenCaptureUsage ?? 100}%` : "Audio only"}
                </span>
              </Td>
              <Td className="font-medium tabular-nums">{rule.mask}</Td>
              <Td>
                <span className="flex flex-wrap gap-1">
                  {DAYS.map((day) => (
                    <span
                      key={day}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${rule[day] ? "bg-primary-soft text-primary" : "text-muted-foreground/50"}`}
                    >
                      {day}
                    </span>
                  ))}
                </span>
              </Td>
              <Td className="tabular-nums">{rule.fromTime}</Td>
              <Td className="tabular-nums">{rule.toTime}</Td>
              <Td>
                <div className="flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Move rule up"
                    disabled={index === 0 || persist.isPending}
                    onClick={() => drop(list[index - 1]!.id, rule.id)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Move rule down"
                    disabled={index === list.length - 1 || persist.isPending}
                    onClick={() => drop(list[index + 1]!.id, rule.id)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit rule"
                    onClick={() => setEditing(rule)}
                  >
                    <Pencil />
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="ms-auto"
                        aria-label={t("labels.delete")}
                        onClick={() => {
                          void confirm({ title: t("labels.delete"), destructive: true }).then((ok) => {
                            if (!ok) return;
                            void deleteRule(rule.id)
                              .then(refresh)
                              .catch((error: Error) => toast.error(error.message));
                          });
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("labels.delete")}</TooltipContent>
                  </Tooltip>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </DataView>
  );
}
