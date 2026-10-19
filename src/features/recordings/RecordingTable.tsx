import { Fragment, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Columns3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { localStore } from "@/core/storage/storage";
import { formatDuration } from "@/core/i18n";
import { getConfig } from "@/config";
import { useCurrentUser } from "@/core/auth";
import type { Recording } from "./api";
import { recordingValue, sortedRecordingGroups } from "./tableModel";
import { cn } from "@/shared/lib/utils";

type Column = { id: string; title: string; width: number; visible: boolean };
function defaults(t: (key: string) => string): Column[] {
  const profile = getConfig().DEPLOYMENT_PROFILE;
  return [
    "callingNumber",
    "calledNumber",
    "agentName",
    "agentId",
    "queueName",
    "startTime",
    "endTime",
    "duration",
    "holdTime",
    "wrapup",
    "direction",
    "sessionId",
    "lastPlayedBy",
    ...Array.from({ length: 10 }, (_, i) => `call_variable${i + 1}`),
  ]
    .filter((id) => (profile === "CISCO" ? !["queueName", "holdTime"].includes(id) : id !== "direction"))
    .map((id) => ({
      id,
      title:
        (
          {
            callingNumber: t("recordings.calling"),
            calledNumber: t("recordings.called"),
            agentName: t("recordings.agent-name"),
            agentId: t("recordings.agent"),
            queueName: t("recordings.queue"),
            startTime: t("recordings.started"),
            endTime: t("recordings.ended"),
            duration: t("recordings.duration"),
            holdTime: t("recordings.hold"),
            wrapup: t("recordings.wrapup"),
            direction: t("recordings.direction"),
            sessionId: "Session ID",
            lastPlayedBy: "Played by",
          } as Record<string, string>
        )[id] ?? `Call variable ${id.replace("call_variable", "")}`,
      width: /Time$/.test(id) ? 190 : id === "agentName" ? 180 : 140,
      visible:
        !["agentId", "endTime", "sessionId", "lastPlayedBy"].includes(id) && !id.startsWith("call_variable"),
    }));
}
export function RecordingTable({
  rows,
  loading,
  tags,
  actions,
}: {
  rows: Recording[];
  loading: boolean;
  tags?: (row: Recording) => ReactNode;
  actions: (row: Recording) => ReactNode;
}) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const storageKey = `recording-columns:${user?.id}:${getConfig().DEPLOYMENT_PROFILE}`;
  const available = defaults(t);
  const [columns, setColumns] = useState<Column[]>(() => {
    const stored = localStore.get<Column[]>(storageKey);
    if (!Array.isArray(stored)) return available;
    const valid = stored
      .filter((c) => available.some((a) => a.id === c.id))
      .map((c) => ({
        ...available.find((a) => a.id === c.id)!,
        visible: Boolean(c.visible),
        width: Math.max(80, Math.min(500, Number(c.width) || 140)),
      }));
    return [...valid, ...available.filter((c) => !valid.some((v) => v.id === c.id))];
  });
  const [settings, setSettings] = useState(false);
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const [sort, setSort] = useState<{ key: string; descending: boolean }>();
  const drag = useRef<{ id: string; start: number; width: number } | null>(null);
  const visible = columns.filter((c) => c.visible);
  const update = (next: Column[]) => {
    setColumns(next);
    localStore.set(storageKey, next);
  };
  const resize = (id: string, width: number) =>
    update(columns.map((c) => (c.id === id ? { ...c, width: Math.max(80, Math.min(500, width)) } : c)));
  const move = (index: number, step: number) => {
    const next = [...columns];
    const other = index + step;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other]!, next[index]!];
    update(next);
  };
  const cell = (row: Recording, c: Column) => {
    const value = recordingValue(row, c.id);
    if ((c.id === "duration" || c.id === "holdTime") && typeof value === "number")
      return formatDuration(value);
    if (c.id === "agentName")
      return (
        <>
          <span className="font-medium">{value || "—"}</span>
          {row.isArchived && (
            <span className="ms-2 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Archived
            </span>
          )}
          {row.lastPlayedBy && (
            <span className="ms-2 text-primary" title={t("recordings.played-by", { name: row.lastPlayedBy })}>
              ▶
            </span>
          )}
        </>
      );
    return value || value === 0 ? value : "—";
  };
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <p className="text-xs text-muted-foreground">
          {rows.length} call legs on this page{sort && " · sorted within this page"}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setSettings(true)}>
          <Columns3 />
          Columns
        </Button>
      </div>
      <table
        className="w-full table-fixed border-collapse text-sm"
        style={{ minWidth: visible.reduce((sum, c) => sum + c.width, 0) + (tags ? 160 : 0) + 240 }}
      >
        <colgroup>
          {visible.map((c) => (
            <col key={c.id} style={{ width: c.width }} />
          ))}
          {tags && <col style={{ width: 160 }} />}
          <col style={{ width: 240 }} />
        </colgroup>
        <thead>
          <tr>
            {visible.map((c) => (
              <th
                key={c.id}
                aria-sort={sort?.key === c.id ? (sort.descending ? "descending" : "ascending") : "none"}
                className="group sticky top-0 z-10 border-b border-border bg-surface-2/60 px-4 py-2.5 text-start text-xs font-medium text-muted-foreground"
              >
                <button
                  type="button"
                  className="flex items-center gap-1 text-start font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setSort({ key: c.id, descending: sort?.key === c.id && !sort.descending })}
                >
                  {available.find((a) => a.id === c.id)?.title}
                  {sort?.key === c.id && (sort.descending ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                </button>
                <div
                  tabIndex={0}
                  role="slider"
                  aria-orientation="horizontal"
                  aria-label={`Resize ${c.title} column`}
                  aria-valuenow={c.width}
                  aria-valuemin={80}
                  aria-valuemax={500}
                  className="absolute inset-y-0 end-0 w-2 cursor-col-resize touch-none border-e border-transparent group-hover:border-border-strong hover:border-primary focus-visible:border-primary"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    drag.current = { id: c.id, start: event.clientX, width: c.width };
                  }}
                  onPointerMove={(event) => {
                    const current = drag.current;
                    if (current?.id === c.id)
                      resize(
                        c.id,
                        current.width +
                          (event.clientX - current.start) *
                            (event.currentTarget.ownerDocument.dir === "rtl" ? -1 : 1),
                      );
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                  }}
                  onKeyDown={(event) => {
                    if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
                      event.preventDefault();
                      resize(
                        c.id,
                        c.width +
                          (event.key === "ArrowRight" ? 10 : -10) *
                            (event.currentTarget.ownerDocument.dir === "rtl" ? -1 : 1),
                      );
                    }
                  }}
                />
              </th>
            ))}
            {tags && (
              <th className="sticky top-0 z-10 border-b border-border bg-surface-2/60 px-4 py-2.5 text-start text-xs font-medium text-muted-foreground">
                Tag
              </th>
            )}
            <th className="sticky end-0 top-0 z-20 border-s border-b border-border bg-surface-2/60 px-4 py-2.5 text-end text-xs font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td
                colSpan={visible.length + (tags ? 1 : 0) + 1}
                className="p-12 text-center text-muted-foreground"
              >
                {loading ? t("globals.loading") : t("recordings.empty")}
              </td>
            </tr>
          )}
          {sortedRecordingGroups(rows, sort?.key, sort?.descending).map(([id, legs]) => (
            <Fragment key={id}>
              {legs.length > 1 && (
                <tr className="border-t border-border bg-surface-2/40">
                  <td colSpan={visible.length + (tags ? 1 : 0) + 1} className="px-4 py-2">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary"
                      aria-expanded={!collapsed.has(id)}
                      onClick={() =>
                        setCollapsed((current) => {
                          const next = new Set(current);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        })
                      }
                    >
                      {collapsed.has(id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}Call{" "}
                      {legs[0]?.correlationId} · {legs.length} legs
                    </button>
                  </td>
                </tr>
              )}
              {!collapsed.has(id) &&
                legs.map((row, index) => (
                  <tr
                    key={`${row.sessionId}:${index}`}
                    className={cn(
                      "border-t border-border transition-colors hover:bg-surface-2",
                      row.isArchived && "opacity-60",
                    )}
                  >
                    {visible.map((c) => (
                      <td
                        key={c.id}
                        className="overflow-hidden px-4 py-3 text-ellipsis"
                        title={String(recordingValue(row, c.id))}
                      >
                        {cell(row, c)}
                      </td>
                    ))}
                    {tags && <td className="px-4 py-3">{tags(row)}</td>}
                    <td className="sticky end-0 border-s border-border bg-surface px-3 py-3">
                      {actions(row)}
                    </td>
                  </tr>
                ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="max-h-[85vh] overflow-auto">
          <DialogTitle>Recording columns</DialogTitle>
          <DialogDescription>
            Choose columns, change their order, and set their width. Preferences are saved for your user and
            tenant.
          </DialogDescription>
          <div className="grid gap-2">
            {columns.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg border p-2">
                <label className="flex flex-1 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={c.visible}
                    disabled={c.visible && visible.length === 1}
                    onChange={(event) =>
                      update(
                        columns.map((a) => (a.id === c.id ? { ...a, visible: event.target.checked } : a)),
                      )
                    }
                  />
                  {available.find((a) => a.id === c.id)?.title}
                </label>
                <Input
                  type="number"
                  min={80}
                  max={500}
                  className="w-20"
                  aria-label={`${c.title} width`}
                  value={c.width}
                  onChange={(event) =>
                    update(
                      columns.map((a) =>
                        a.id === c.id
                          ? { ...a, width: Math.max(80, Math.min(500, Number(event.target.value) || 80)) }
                          : a,
                      ),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${c.title} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${c.title} down`}
                  disabled={i === columns.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={() => update(available)}>
            Reset columns
          </Button>
          <Button onClick={() => setSettings(false)}>Done</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
