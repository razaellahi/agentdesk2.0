import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useCallback, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";

export interface GridColumn {
  id: string;
  label: string;
  values: Record<string, string>;
  saved?: Record<string, string>;
  editable: boolean;
  onChange?: (key: string, value: string) => void;
}

interface TranslationGridProps {
  keys: string[];
  columns: GridColumn[];
  showKeys: boolean;
  keyWidth: number;
  onKeyWidthChange: (pct: number) => void;
}

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.max(30, el.scrollHeight)}px`;
}

const Cell = memo(function Cell({
  rowKey,
  index,
  column,
  value,
  modified,
  onEnter,
}: {
  rowKey: string;
  index: number;
  column: GridColumn;
  value: string;
  modified: boolean;
  onEnter: (index: number, columnId: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => autoGrow(ref.current), [value]);
  if (!column.editable) {
    return <div className="px-3 py-1.5 text-sm break-words whitespace-pre-wrap">{value}</div>;
  }
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      data-cell={`${column.id}:${index}`}
      aria-label={`${column.label}: ${rowKey}`}
      onChange={(e) => column.onChange?.(rowKey, e.target.value)}
      onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter moves to the next row (Shift+Enter inserts a newline), as before.
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter(index + 1, column.id);
        }
      }}
      className={cn(
        "block w-full resize-none rounded-md border border-transparent bg-transparent px-3 py-1.5 text-sm outline-none",
        "hover:border-border focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20",
        modified && "bg-warning-soft",
      )}
    />
  );
});

/** Virtualized key/value editor grid (handles thousands of keys). */
export function TranslationGrid({
  keys,
  columns,
  showKeys,
  keyWidth,
  onKeyWidthChange,
}: TranslationGridProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual returns unstable functions by design; the compiler skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: keys.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const focusCell = useCallback(
    (index: number, columnId: string) => {
      if (index >= keys.length) return;
      virtualizer.scrollToIndex(index, { align: "auto" });
      requestAnimationFrame(() => {
        const el = scrollRef.current?.querySelector<HTMLTextAreaElement>(
          `[data-cell="${columnId}:${index}"]`,
        );
        el?.focus();
        el?.select();
      });
    },
    [keys.length, virtualizer],
  );

  const startResize = (event: React.PointerEvent) => {
    const table = tableRef.current;
    if (!table) return;
    const startX = event.clientX;
    const startWidth = keyWidth;
    const width = table.offsetWidth;
    const rtl = getComputedStyle(table).direction === "rtl";
    const move = (e: PointerEvent) => {
      const dx = (e.clientX - startX) * (rtl ? -1 : 1);
      onKeyWidthChange(Math.min(80, Math.max(15, startWidth + (dx / width) * 100)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const valueWidth = (100 - (showKeys ? keyWidth : 0)) / columns.length;
  const template = `${showKeys ? `${keyWidth}% ` : ""}${columns.map(() => `${valueWidth}%`).join(" ")}`;

  return (
    <div ref={tableRef} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-surface">
      <div
        className="grid shrink-0 border-b bg-surface-2 text-xs font-semibold tracking-wide text-medium uppercase"
        style={{ gridTemplateColumns: template }}
      >
        {showKeys && (
          <div className="relative px-3 py-2.5">
            {t("admin-translations.key")}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={t("admin-translations.resize")}
              onPointerDown={startResize}
              className="absolute inset-y-0 end-0 w-1.5 cursor-col-resize hover:bg-primary/40"
            />
          </div>
        )}
        {columns.map((c) => (
          <div key={c.id} className="truncate px-3 py-2.5">
            {c.label}
          </div>
        ))}
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const key = keys[item.index]!;
            return (
              <div
                key={key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                className="absolute start-0 top-0 grid w-full items-start border-b px-0 py-1 hover:bg-surface-2/40"
                style={{ transform: `translateY(${item.start}px)`, gridTemplateColumns: template }}
              >
                {showKeys && (
                  <div className="px-3 py-1.5 font-mono text-xs break-all text-muted-foreground">{key}</div>
                )}
                {columns.map((c) => (
                  <div key={c.id} className="px-1">
                    <Cell
                      rowKey={key}
                      index={item.index}
                      column={c}
                      value={c.values[key] ?? ""}
                      modified={Boolean(c.saved) && (c.saved?.[key] ?? "") !== (c.values[key] ?? "")}
                      onEnter={focusCell}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {keys.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("globals.no-data-available")}</p>
        )}
      </div>
    </div>
  );
}
