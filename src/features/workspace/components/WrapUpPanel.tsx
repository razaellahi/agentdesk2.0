import { useQuery, useQueries } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration } from "@/core/i18n";
import { useSecondsLeft } from "@/shared/hooks/useNow";
import { cn } from "@/shared/lib/utils";
import {
  getWrapUpCategories,
  getWrapUpForm,
  getWrapUpOptions,
  searchWrapUps,
  type WrapUpOption,
} from "../api";
import type { WrapUpSelection } from "../model/outgoing";

const MAX_CODES = 50;

function optionLabel(option: WrapUpOption) {
  return String(option.value ?? option.label ?? "");
}

function CategoryOptions({
  categoryIndex,
  label,
  disabled,
  onPick,
}: {
  categoryIndex: number;
  label: string;
  disabled: boolean;
  onPick: (category: string, value: string) => void;
}) {
  const { t } = useTranslation();
  const [pages, setPages] = useState(1);
  const queries = useQueries({
    queries: Array.from({ length: pages }, (_, i) => ({
      queryKey: ["workspace", "wrapup-options", categoryIndex, i + 1],
      queryFn: () => getWrapUpOptions(categoryIndex, i + 1),
    })),
  });
  const options = queries.flatMap((q) => q.data?.options ?? []);
  const last = queries[queries.length - 1]?.data;
  const total = last?.metadata?.totalOptions ?? options.length;
  const loading = queries.some((q) => q.isLoading);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface-2/40 p-3">
      <p className="text-[12px] font-medium tracking-wider text-muted-foreground uppercase">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const value = optionLabel(option);
          if (!value) return null;
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => onPick(label, value)}
              className="hover:bg-primary-lt rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              {value}
            </button>
          );
        })}
        {loading && <Loader2 className="size-4 animate-spin text-primary" />}
      </div>
      {options.length < total && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hover:bg-primary-lt mt-1 h-7 text-xs font-medium text-primary"
          onClick={() => setPages((p) => p + 1)}
        >
          {t("chat-features.interactions.load-more")}
        </Button>
      )}
    </div>
  );
}

/** Wrap-up codes and notes (unified-admin form 62d07f4f0980a50a91210bef). */
export function WrapUpPanel({
  deadline,
  onSave,
  onSkip,
  onClose,
  chrome = true,
}: {
  deadline: number | null;
  onSave: (wrapups: WrapUpSelection[], note: string) => void;
  onSkip?: () => void;
  onClose?: () => void;
  /** When false, omit outer card chrome (used inside a Sheet). */
  chrome?: boolean;
}) {
  const { t } = useTranslation();
  const seconds = useSecondsLeft(deadline);
  const [pages, setPages] = useState(1);
  const [selected, setSelected] = useState<WrapUpSelection[]>([]);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search.trim());

  const form = useQuery({
    queryKey: ["workspace", "wrapup-form"],
    queryFn: getWrapUpForm,
    staleTime: Infinity,
  });
  const multiple = form.data?.sections?.[0]?.attributes?.[0]?.attributeOptions?.isMultipleChoice !== false;
  const limit = multiple ? MAX_CODES : 1;

  const categories = useQuery({
    queryKey: ["workspace", "wrapup-categories", pages],
    queryFn: async () => {
      const loaded = [];
      let hasMore = true;
      for (let page = 1; page <= pages && hasMore; page++) {
        const res = await getWrapUpCategories(page);
        loaded.push(...(res.categories ?? []));
        const meta = res.metadata;
        hasMore = Boolean(
          meta?.hasMore ??
          (meta?.totalPages ? page < meta.totalPages : (res.categories?.length ?? 0) > 0 && page === pages),
        );
        if (!(res.categories?.length ?? 0)) hasMore = false;
      }
      return { categories: loaded, hasMore };
    },
  });

  const searchQuery = useQuery({
    queryKey: ["workspace", "wrapup-search", query],
    enabled: query.length > 0,
    queryFn: () => searchWrapUps(query, 1),
  });

  const pick = (categoryName: string, value: string) => {
    setSelected((current) => {
      if (current.some((item) => item.categoryName === categoryName && item.value === value)) return current;
      if (current.length >= limit) return multiple ? current : [{ categoryName, value }];
      return [...current, { categoryName, value }];
    });
  };

  return (
    <section
      className={cn(
        "flex flex-col gap-3.5",
        chrome && "max-h-[50%] overflow-auto border-t border-border bg-surface p-4 shadow-lg",
      )}
      aria-label={t("chat-features.interactions.wrapup")}
    >
      {chrome && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {t("chat-features.interactions.wrapup")}
          </h3>
          {seconds !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
                seconds <= 30
                  ? "animate-pulse border border-destructive/30 bg-destructive-soft text-destructive-text"
                  : "border border-warning/30 bg-warning-soft text-warning-text",
              )}
            >
              ⏱️ {formatDuration(seconds)}
            </span>
          )}
        </div>
      )}
      {!chrome && seconds !== null && (
        <p className="text-sm font-medium text-warning-text tabular">{formatDuration(seconds)}</p>
      )}
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("workspace.search-wrapup")}
        aria-label={t("workspace.search-wrapup")}
        className="h-9 rounded-lg"
      />
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <li
              key={`${item.categoryName}:${item.value}`}
              className="bg-primary-lt inline-flex animate-in items-center gap-1.5 rounded-full border border-primary/20 px-3 py-1 text-xs font-medium text-primary zoom-in-95 fade-in"
            >
              <span>{item.value}</span>
              <button
                type="button"
                aria-label={t("globals.close")}
                className="rounded-full p-0.5 text-primary hover:bg-primary/20"
                onClick={() => setSelected((c) => c.filter((x) => x !== item))}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {query ? (
        <div className="flex flex-wrap gap-1.5">
          {(searchQuery.data?.results ?? []).map((option) => {
            const value = optionLabel(option);
            return (
              <button
                key={`${option.categoryName}-${value}`}
                type="button"
                className="hover:bg-primary-lt rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                onClick={() => pick(String(option.categoryName ?? ""), value)}
              >
                {option.categoryName ? `${option.categoryName}: ` : ""}
                {value}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {(categories.data?.categories ?? []).map((category, index) => (
            <CategoryOptions
              key={category._categoryIndex ?? index}
              categoryIndex={category._categoryIndex ?? index}
              label={String(category.label ?? "")}
              disabled={selected.length >= limit && multiple}
              onPick={pick}
            />
          ))}
          {categories.data?.hasMore && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hover:bg-primary-lt text-xs font-medium text-primary"
              onClick={() => setPages((p) => p + 1)}
            >
              {t("chat-features.interactions.load-more")}
            </Button>
          )}
        </div>
      )}
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={t("chat-features.interactions.notes")}
        aria-label={t("chat-features.interactions.notes")}
        className="rounded-lg"
      />
      <div className="flex justify-end gap-2 pt-1">
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg text-xs font-medium"
            onClick={onClose}
          >
            {t("chat-features.interactions.cancel")}
          </Button>
        )}
        {onSkip && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-medium"
            onClick={onSkip}
          >
            {t("workspace.skip-wrapup")}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="rounded-lg text-xs font-medium"
          onClick={() => onSave(selected, note)}
          disabled={!selected.length && !note.trim()}
        >
          {t("chat-features.interactions.apply")}
        </Button>
      </div>
    </section>
  );
}
