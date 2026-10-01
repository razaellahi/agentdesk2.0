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
    <div className="rounded-lg border p-2">
      <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const value = optionLabel(option);
          if (!value) return null;
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => onPick(label, value)}
              className="rounded-full border px-2 py-0.5 text-xs hover:bg-primary-soft disabled:opacity-50"
            >
              {value}
            </button>
          );
        })}
        {loading && <Loader2 className="size-4 animate-spin" />}
      </div>
      {options.length < total && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1"
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
}: {
  deadline: number | null;
  onSave: (wrapups: WrapUpSelection[], note: string) => void;
  onSkip?: () => void;
  onClose?: () => void;
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
      className="flex max-h-[50%] flex-col gap-2 overflow-auto border-t bg-surface p-3"
      aria-label={t("chat-features.interactions.wrapup")}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("chat-features.interactions.wrapup")}</h3>
        {seconds !== null && (
          <span className="text-sm font-semibold text-warning-text tabular">{formatDuration(seconds)}</span>
        )}
      </div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("workspace.search-wrapup")}
        aria-label={t("workspace.search-wrapup")}
      />
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {selected.map((item) => (
            <li
              key={`${item.categoryName}:${item.value}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary",
              )}
            >
              {item.value}
              <button
                type="button"
                aria-label={t("globals.close")}
                onClick={() => setSelected((c) => c.filter((x) => x !== item))}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {query ? (
        <div className="flex flex-wrap gap-1">
          {(searchQuery.data?.results ?? []).map((option) => {
            const value = optionLabel(option);
            return (
              <button
                key={`${option.categoryName}-${value}`}
                type="button"
                className="rounded-full border px-2 py-0.5 text-xs"
                onClick={() => pick(String(option.categoryName ?? ""), value)}
              >
                {option.categoryName ? `${option.categoryName}: ` : ""}
                {value}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setPages((p) => p + 1)}>
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
      />
      <div className="flex justify-end gap-2">
        {onClose && (
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("chat-features.interactions.cancel")}
          </Button>
        )}
        {onSkip && (
          <Button type="button" variant="outline" onClick={onSkip}>
            {t("workspace.skip-wrapup")}
          </Button>
        )}
        <Button
          type="button"
          onClick={() => onSave(selected, note)}
          disabled={!selected.length && !note.trim()}
        >
          {t("chat-features.interactions.apply")}
        </Button>
      </div>
    </section>
  );
}
