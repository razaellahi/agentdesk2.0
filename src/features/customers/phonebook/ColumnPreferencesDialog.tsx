import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createUserPreference, updateUserPreference } from "./preferencesApi";
import type { PhonebookColumn, SchemaAttr, UserPreferenceDoc } from "./types";

export function ColumnPreferencesDialog({
  open,
  onClose,
  userId,
  preference,
  schema,
  columns,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  preference: UserPreferenceDoc | null;
  schema: SchemaAttr[];
  columns: PhonebookColumn[];
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const available = useMemo(
    () =>
      schema.filter((item) => item.key && item.key !== "isAnonymous" && item.key.toLowerCase() !== "labels"),
    [schema],
  );
  const [selected, setSelected] = useState<PhonebookColumn[]>(() => [...columns]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        user_Id: userId,
        pageSize: null as null,
        columns: selected.map((col) => ({
          field: col.field,
          header: col.header,
          type: col.type ?? "string",
        })),
        sortOption: [{ field: "", sortOption: "" }],
      };
      if (preference?._id) return updateUserPreference(preference._id, payload);
      return createUserPreference(payload);
    },
    onSuccess: async () => {
      toast.success(t("column-preferences.save"));
      await client.invalidateQueries({ queryKey: ["phonebook-preference"] });
      onClose();
    },
    onError: (error: unknown) => toast.error(String(error)),
  });

  const toggle = (attr: SchemaAttr, checked: boolean) => {
    if (!attr.key) return;
    if (checked) {
      setSelected((current) => [
        ...current,
        {
          field: attr.key!,
          header: attr.label || attr.key!,
          type: attr.type,
          key: attr.key,
          isPii: attr.isPii,
          isSearchAble: attr.isSearchAble,
          channelTypes: attr.channelTypes,
        },
      ]);
      return;
    }
    setSelected((current) => current.filter((col) => col.field !== attr.key));
  };

  const move = (index: number, direction: -1 | 1) => {
    setSelected((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const [item] = next.splice(index, 1);
      if (item) next.splice(target, 0, item);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("column-preferences.column-preferences")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("column-preferences.columns")}
            </p>
            <ScrollArea className="h-64 rounded-md border p-2">
              <ul className="space-y-2">
                {available.map((attr) => {
                  const checked = selected.some((col) => col.field === attr.key);
                  return (
                    <li key={attr.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggle(attr, value === true)}
                        id={`col-${attr.key}`}
                      />
                      <label htmlFor={`col-${attr.key}`}>{attr.label || attr.key}</label>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("column-preferences.selected-columns")}
            </p>
            <ScrollArea className="h-64 rounded-md border p-2">
              <ul className="space-y-1">
                {selected.map((col, index) => (
                  <li
                    key={col.field}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span className="truncate">{col.header}</span>
                    <span className="flex shrink-0">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label={t("globals.ascending")}
                      >
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === selected.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label={t("globals.decending")}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("column-preferences.cancel")}
          </Button>
          <Button
            type="button"
            disabled={selected.length === 0 || save.isPending}
            onClick={() => save.mutate()}
          >
            {t("column-preferences.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
