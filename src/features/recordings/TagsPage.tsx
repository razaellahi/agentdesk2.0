import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm";
import { DataView } from "@/components/common/DataView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTag, deleteTag, listTags, updateTag } from "./api";

export default function TagsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const query = useQuery({ queryKey: ["recording-tags"], queryFn: listTags });
  const add = useMutation({
    mutationFn: () =>
      editing == null ? createTag(name.trim()) : updateTag({ id: editing, name: name.trim() }),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: async () => {
      setName("");
      setEditing(null);
      toast.success(t("snackbar.Label-Created"));
      await queryClient.invalidateQueries({ queryKey: ["recording-tags"] });
    },
  });
  const remove = useMutation({
    mutationFn: deleteTag,
    onError: (e: Error) => toast.error(e.message),
    onSuccess: async () => {
      toast.success(t("snackbar.Label-Deleted"));
      await queryClient.invalidateQueries({ queryKey: ["recording-tags"] });
    },
  });

  return (
    <DataView
      title="Recording tags"
      toolbar={
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) add.mutate();
          }}
        >
          <Input
            aria-label="Tag name"
            maxLength={100}
            disabled={add.isPending}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("recordings.name")}
            className="w-56"
          />
          <Button type="submit" disabled={!name.trim() || add.isPending}>
            {editing == null ? t("recordings.add-tag") : t("labels.save")}
          </Button>
          {editing != null && (
            <Button
              type="button"
              variant="outline"
              disabled={add.isPending}
              onClick={() => {
                setEditing(null);
                setName("");
              }}
            >
              Cancel
            </Button>
          )}
        </form>
      }
    >
      {query.isPending && (
        <p role="status" className="p-4 text-muted-foreground">
          Loading tags…
        </p>
      )}
      {query.isError && (
        <p role="alert" className="p-4 text-destructive-text">
          {query.error.message}
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {(query.data ?? []).map((tag) => (
          <div key={tag.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <button
              disabled={add.isPending}
              className="font-medium hover:text-primary"
              onClick={() => {
                setEditing(tag.id);
                setName(tag.name);
              }}
              aria-label={`Edit ${tag.name}`}
            >
              {tag.name}
            </button>
            <Button
              size="sm"
              variant="ghost"
              disabled={remove.isPending || add.isPending}
              onClick={() => {
                void confirm({ title: t("labels.delete"), destructive: true }).then((ok) => {
                  if (ok) remove.mutate(tag.id);
                });
              }}
            >
              {t("labels.delete")}
            </Button>
          </div>
        ))}
        {query.isSuccess && (query.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">{t("recordings.empty")}</p>
        )}
      </div>
    </DataView>
  );
}
