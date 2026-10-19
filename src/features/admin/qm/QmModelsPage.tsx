import { ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm";
import { DataTable, DataView, Td, Th } from "@/components/common/DataView";
import { EmptyState, Pager, SearchField } from "@/components/common/ListChrome";
import { QueryError } from "@/components/common/QueryError";
import { ReadOnlyNotice } from "@/components/common/ReadOnlyNotice";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/core/auth";
import { formatDateTime } from "@/core/i18n";
import { deleteQmModel, getQmModel, listQmModels } from "./api";
import { blankModel, type QmModelDraft } from "./model";
import { QmModelEditor } from "./QmModelEditor";

const PAGE_SIZE = 10;

export default function QmModelsPage() {
  const { t } = useTranslation();
  const canManage = usePermission("qmModelsManage");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<QmModelDraft | null>(null);
  const [opening, setOpening] = useState(false);

  const models = useQuery({ queryKey: ["qm-models"], queryFn: listQmModels });
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = models.data ?? [];
    if (!term) return rows;
    return rows.filter((row) => row.formTitle.toLowerCase().includes(term));
  }, [models.data, search]);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const remove = useMutation({
    mutationFn: deleteQmModel,
    onSuccess: async () => {
      toast.success(t("qm.deleted"));
      await queryClient.invalidateQueries({ queryKey: ["qm-models"] });
    },
    onError: (cause: Error) => toast.error(cause.message),
  });

  async function openEditor(id?: string) {
    if (!id) {
      setEditor(blankModel());
      return;
    }
    setOpening(true);
    try {
      setEditor(await getQmModel(id));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t("errors.load-failed"));
    } finally {
      setOpening(false);
    }
  }

  if (editor) {
    return <QmModelEditor initial={editor} existing={models.data ?? []} onClose={() => setEditor(null)} />;
  }

  return (
    <DataView
      description={t("qm.description-page")}
      banner={!canManage ? <ReadOnlyNotice /> : undefined}
      toolbar={
        <>
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(0);
            }}
            placeholder={t("qm.search")}
            className="w-64"
          />
          {canManage && (
            <Button className="ms-auto" disabled={opening} onClick={() => void openEditor()}>
              <Plus />
              {t("qm.new")}
            </Button>
          )}
        </>
      }
      footer={<Pager page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />}
    >
      <QueryError error={models.error} onRetry={() => void models.refetch()} />
      {(models.isPending || opening) && (
        <p className="p-4 text-sm text-muted-foreground">{t("qm.loading")}</p>
      )}
      {!models.isPending && filtered.length === 0 && (
        <EmptyState icon={ClipboardCheck} title={t("qm.empty")} description={t("qm.empty-hint")} />
      )}
      {filtered.length > 0 && (
        <DataTable>
          <thead>
            <tr>
              <Th>{t("qm.title-field")}</Th>
              <Th>{t("qm.description")}</Th>
              <Th>{t("qm.state")}</Th>
              <Th>{t("qm.updated")}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {visible.map((model) => (
              <tr key={model.id}>
                <Td className="font-medium">{model.formTitle}</Td>
                <Td className="max-w-72 truncate">{model.formDescription || t("teams.none")}</Td>
                <Td>
                  <span
                    className={
                      model.state === "published"
                        ? "rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success-text"
                        : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {t(model.state === "published" ? "qm.published" : "qm.unpublished")}
                  </span>
                </Td>
                <Td>{model.updatedAt ? formatDateTime(model.updatedAt) : t("teams.none")}</Td>
                <Td className="text-end">
                  {canManage && (
                    <>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("qm.edit")}
                        onClick={() => void openEditor(model.id)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("qm.delete")}
                        onClick={() => {
                          void confirm({
                            title: t("qm.delete-title", { name: model.formTitle }),
                            description: t("qm.delete-body"),
                            confirmLabel: t("qm.delete"),
                            destructive: true,
                          }).then((ok) => {
                            if (ok) remove.mutate(model.id);
                          });
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </DataView>
  );
}
