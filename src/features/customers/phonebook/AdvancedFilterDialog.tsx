import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSavedFilter, getFilterByName, updateSavedFilter } from "./filtersApi";
import { filterRowsFromQuery, newFilterRow, operatorsForType, parseFilterForm } from "./parseFilterForm";
import type { FilterRow, SavedFilter, SchemaAttr } from "./types";
import type { Label } from "../api";

const OP_LABEL: Record<string, string> = {
  startsWith: "phonebook.advance-filters.starts-with",
  endsWith: "phonebook.advance-filters.ends-with",
  equalTo: "phonebook.advance-filters.equal-to",
  notEqualTo: "phonebook.advance-filters.not-equal-to",
  contains: "phonebook.advance-filters.contains",
  notContains: "phonebook.advance-filters.not-contains",
  isEmpty: "phonebook.advance-filters.is-empty",
  isNotEmpty: "phonebook.advance-filters.is-not-empty",
};

export function AdvancedFilterDialog({
  open,
  onClose,
  schema,
  labels,
  editing,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  schema: SchemaAttr[];
  labels: Label[];
  editing: SavedFilter | null;
  onApplied: (filter: SavedFilter) => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const attributes = useMemo(() => {
    const searchable = schema.filter(
      (item) => item.key && item.key !== "isAnonymous" && item.isSearchAble !== false,
    );
    return [
      ...searchable,
      { key: "labels", label: t("labels.customer-labels"), type: "labels", isSearchAble: true },
    ];
  }, [schema, t]);

  const [name, setName] = useState(editing?.filterName ?? "");
  const [rows, setRows] = useState<FilterRow[]>(() =>
    editing ? filterRowsFromQuery(editing.filterQuery) : [newFilterRow()],
  );
  const [nameError, setNameError] = useState("");

  const uniqueCount = new Set(
    rows.filter((row) => row.filterOption === "AND" && row.attributeName).map((r) => r.attributeName),
  ).size;

  const save = useMutation({
    mutationFn: async () => {
      const filterName = name.trim();
      if (!filterName) throw new Error(t("customer-schema.required"));
      const existing = await getFilterByName(filterName);
      if (existing && existing._id !== editing?._id) {
        throw new Error(t("advance-filters.filter-name-already-exists"));
      }
      const query = parseFilterForm(
        rows.filter((row) => (row.filterOption === "AND" ? Boolean(row.attributeName) : true)),
      );
      if (editing?._id) return updateSavedFilter(editing._id, filterName, query);
      return createSavedFilter(filterName, query);
    },
    onSuccess: async (filter) => {
      toast.success(t("advance-filters.save-and-apply"));
      await client.invalidateQueries({ queryKey: ["phonebook-saved-filters"] });
      onApplied(filter);
      onClose();
    },
    onError: (error: unknown) => {
      const message = String(error);
      if (message.includes("already exists")) setNameError(message);
      toast.error(message);
    },
  });

  const updateRow = (id: string, patch: Partial<FilterRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("advance-filters.advanced-filter")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("advance-filters.filter-title")}
            aria-invalid={Boolean(nameError)}
          />
          {nameError && <p className="text-xs text-destructive-text">{nameError}</p>}
          {uniqueCount >= 5 && (
            <p className="text-xs text-warning">
              {t("advance-filters.selected-5-different-attributes-query-may-take-longer")}
            </p>
          )}
          <div className="space-y-2">
            {rows.map((row, index) => {
              if (row.filterOption === "OR") {
                return (
                  <div key={row.id} className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                      {t("phonebook.advance-filters.or")}
                    </span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              }
              const attr = attributes.find((item) => item.key === row.attributeName);
              const ops = operatorsForType(attr?.type);
              return (
                <div
                  key={row.id}
                  className="grid gap-2 rounded-xl border p-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <Select
                    value={row.attributeName || undefined}
                    onValueChange={(value) => {
                      const next = attributes.find((item) => item.key === value);
                      updateRow(row.id, {
                        attributeName: value,
                        filterCondition: operatorsForType(next?.type)[0] ?? "contains",
                        filterValue: "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("advance-filters.select-attribute")} />
                    </SelectTrigger>
                    <SelectContent>
                      {attributes.map((item) => (
                        <SelectItem key={item.key} value={item.key!}>
                          {item.label || item.key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={row.filterCondition || undefined}
                    onValueChange={(value) => updateRow(row.id, { filterCondition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("advance-filters.select-operator")} />
                    </SelectTrigger>
                    <SelectContent>
                      {ops.map((op) => (
                        <SelectItem key={op} value={op}>
                          {t(OP_LABEL[op] ?? op)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {attr?.type === "labels" ? (
                    <Select
                      value={
                        Array.isArray(row.filterValue) ? row.filterValue[0] : String(row.filterValue || "")
                      }
                      onValueChange={(value) => updateRow(row.id, { filterValue: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("advance-filters.select-labels")} />
                      </SelectTrigger>
                      <SelectContent>
                        {labels.map((label) => (
                          <SelectItem key={label._id} value={label._id}>
                            {label.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : attr?.type === "boolean" ? (
                    <Select
                      value={String(row.filterValue || "")}
                      onValueChange={(value) => updateRow(row.id, { filterValue: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("advance-filters.select-value")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">true</SelectItem>
                        <SelectItem value="false">false</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={String(row.filterValue ?? "")}
                      disabled={row.filterCondition === "isEmpty" || row.filterCondition === "isNotEmpty"}
                      onChange={(event) => updateRow(row.id, { filterValue: event.target.value })}
                      placeholder={t("advance-filters.type-here")}
                    />
                  )}
                  <div className="flex items-center gap-1">
                    {index === rows.length - 1 && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setRows((current) => [...current, newFilterRow("AND")])}
                        aria-label={t("labels.add-new-label")}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={rows.filter((r) => r.filterOption === "AND").length <= 1}
                      onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => setRows((current) => [...current, newFilterRow("OR"), newFilterRow("AND")])}
          >
            {t("phonebook.advance-filters.or")}
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("customer-schema.cancel")}
          </Button>
          <Button type="button" disabled={save.isPending || !name.trim()} onClick={() => save.mutate()}>
            {t("advance-filters.save-and-apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
