import { Filter, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { deleteSavedFilter, listSavedFilters } from "./filtersApi";
import type { SavedFilter } from "./types";

export function SavedFiltersMenu({
  appliedId,
  onApply,
  onEdit,
  onCreate,
}: {
  appliedId?: string | null;
  onApply: (filter: SavedFilter | null) => void;
  onEdit: (filter: SavedFilter) => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["phonebook-saved-filters"],
    queryFn: () => listSavedFilters(50, 0),
  });
  const remove = useMutation({
    mutationFn: deleteSavedFilter,
    onSuccess: async () => {
      toast.success(t("advance-filters.filter-deleted-successfully"));
      await client.invalidateQueries({ queryKey: ["phonebook-saved-filters"] });
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Filter className="size-3.5" />
          {t("advance-filters.saved-filters")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("advance-filters.saved-filters")}
          </p>
          <Button type="button" size="sm" variant="ghost" onClick={onCreate}>
            {t("advance-filters.advanced-filter")}
          </Button>
        </div>
        <ScrollArea className="max-h-72">
          {(query.data?.docs ?? []).length === 0 && (
            <p className="px-2 py-4 text-sm text-muted-foreground">{t("globals.no-data-available")}</p>
          )}
          <ul className="space-y-1">
            {(query.data?.docs ?? []).map((filter) => (
              <li
                key={filter._id}
                className={`flex items-center gap-1 rounded-md px-2 py-1.5 ${appliedId === filter._id ? "bg-primary-soft" : "hover:bg-muted"}`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-start text-sm"
                  onClick={() => onApply(filter)}
                >
                  {filter.filterName}
                </button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t("labels.edit")}
                  onClick={() => onEdit(filter)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t("labels.delete")}
                  onClick={() => {
                    void confirm({
                      title: t("phonebook.delete-filter"),
                      description: t("advance-filters.are-you-sure-you-want-to-delete-filter", {
                        filter: filter.filterName,
                      }),
                      destructive: true,
                    }).then((ok) => {
                      if (!ok) return;
                      remove.mutate(filter._id);
                      if (appliedId === filter._id) onApply(null);
                    });
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
        {appliedId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => onApply(null)}
          >
            {t("labels.cancel")}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
