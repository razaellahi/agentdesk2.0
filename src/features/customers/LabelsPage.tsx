import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryError } from "@/components/common/QueryError";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm";
import { DataView } from "@/components/common/DataView";
import { EmptyState } from "@/components/common/ListChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermission } from "@/core/auth";
import { createLabel, deleteLabel, listLabels, updateLabel, type Label } from "./api";

export default function LabelsPage() {
  const { t } = useTranslation();
  const canManage = usePermission("customerLabelsManage");
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["labels"], queryFn: listLabels });
  const [editing, setEditing] = useState<Label | null>(null);
  const [name, setName] = useState("");
  // Label colours are stored as hex; the native colour input cannot take a theme token.
  // eslint-disable-next-line no-restricted-syntax
  const [color, setColor] = useState("#3b82f6");

  const save = useMutation({
    mutationFn: () =>
      editing
        ? updateLabel(editing._id, { name, colorCode: color })
        : createLabel({ name, colorCode: color }),
    onSuccess: async () => {
      toast.success(t(editing ? "snackbar.Label-Updated" : "snackbar.Label-Created"));
      setEditing(null);
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  const remove = useMutation({
    mutationFn: deleteLabel,
    onSuccess: async () => {
      toast.success(t("snackbar.Label-Deleted"));
      await queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  return (
    <DataView
      toolbar={
        canManage && (
          <form
            className="flex w-full flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) save.mutate();
            }}
          >
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("labels.label")}
              className="w-56"
            />
            <input
              type="color"
              aria-label={t("labels.label")}
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="size-9 cursor-pointer rounded-md border bg-transparent"
            />
            <Button type="submit" disabled={save.isPending || !name.trim()}>
              <Plus />
              {editing ? t("labels.update") : t("labels.add-new-label")}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  setName("");
                }}
              >
                {t("labels.cancel")}
              </Button>
            )}
          </form>
        )
      }
    >
      <QueryError error={query.error} onRetry={() => void query.refetch()} />
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {(query.data ?? []).map((label) => (
          <div
            key={label._id}
            className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-xs"
          >
            <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: label.colorCode }} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{label.name}</span>
            {canManage && (
              <>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t("labels.edit")}
                  onClick={() => {
                    setEditing(label);
                    setName(label.name);
                    setColor(label.colorCode);
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t("labels.delete")}
                  onClick={() => {
                    void confirm({
                      title: t("snackbar.Delete-Label"),
                      description: t("snackbar.Are-you-sure-you-want-to-delete-the-label?"),
                      destructive: true,
                    }).then((ok) => {
                      if (ok) remove.mutate(label._id);
                    });
                  }}
                >
                  <Trash2 />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
      {query.isSuccess && (query.data ?? []).length === 0 && (
        <EmptyState icon={Tag} title={t("labels.no-data-available")} />
      )}
    </DataView>
  );
}
