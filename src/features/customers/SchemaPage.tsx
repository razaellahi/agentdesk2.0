import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ListTree, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm";
import { DataTable, DataView, EmptyRow, Td, Th } from "@/components/common/DataView";
import { EmptyState } from "@/components/common/ListChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cimCustomerApi } from "@/core/api";
import { usePermission } from "@/core/auth";
import { unwrapList } from "@/shared/lib/unwrap";

interface Attribute {
  _id?: string;
  label?: string;
  key?: string;
  type?: string;
  isRequired?: boolean;
  isPii?: boolean;
  isSearchAble?: boolean;
  isDeleteAble?: boolean;
  description?: string;
  length?: number | string;
  sortOrder?: number;
  defaultValue?: string;
  isChannelIdentifier?: boolean;
  channelTypes?: string[];
}

function camelize(label: string) {
  return label
    .replace(/\s(.)/g, (part) => part.toUpperCase())
    .replace(/\s/g, "")
    .replace(/^(.)/, (part) => part.toLowerCase());
}

export default function SchemaPage() {
  const { t } = useTranslation();
  const canManage = usePermission("customerSchemaManage");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["customer-schema"],
    queryFn: async () => unwrapList<Attribute>(await cimCustomerApi.get("/customerSchema")),
  });
  const [order, setOrder] = useState<Attribute[] | null>(null);
  const [label, setLabel] = useState("");
  const [editing, setEditing] = useState<Attribute | null>(null);
  const [editDraft, setEditDraft] = useState<Attribute | null>(null);
  const rows = order ?? query.data ?? [];

  const refresh = async () => {
    setOrder(null);
    await queryClient.invalidateQueries({ queryKey: ["customer-schema"] });
  };

  const create = useMutation({
    mutationFn: () =>
      cimCustomerApi.post("/customerSchema", {
        key: camelize(label),
        label,
        description: "",
        type: "string",
        length: 50,
        isRequired: false,
        isSearchAble: true,
        defaultValue: "",
        isPii: false,
        isChannelIdentifier: false,
        isDeleteAble: true,
        channelTypes: [],
      }),
    onSuccess: async () => {
      setLabel("");
      toast.success(t("customer-schema.create-attribute"));
      await refresh();
    },
  });

  const saveOrder = useMutation({
    mutationFn: () => {
      const payload = rows.map((item, index) => {
        const next = { ...item, sortOrder: index + 1 };
        delete next._id;
        return next;
      });
      return cimCustomerApi.put("/customerSchemaOrder", payload);
    },
    onSuccess: async () => {
      toast.success(t("snackbar.SORT-ORDER-UPDATED-SUCCESSFULLY"));
      await refresh();
    },
  });

  const update = useMutation({
    mutationFn: () => {
      if (!editing?._id || !editDraft) throw new Error("missing");
      const payload = {
        ...editDraft,
        isDeleteAble: editing.isDeleteAble,
        sortOrder: editing.sortOrder,
      };
      delete payload._id;
      return cimCustomerApi.put(`/customerSchema/${editing._id}`, payload);
    },
    onSuccess: async () => {
      toast.success(t("customer-schema.update-attribute"));
      setEditing(null);
      setEditDraft(null);
      await refresh();
    },
    onError: (error: unknown) => toast.error(String(error)),
  });

  const move = (index: number, direction: -1 | 1) => {
    const next = [...rows];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    setOrder(next);
  };

  const openEdit = (attribute: Attribute) => {
    setEditing(attribute);
    setEditDraft({ ...attribute });
  };

  return (
    <DataView
      toolbar={
        canManage && (
          <form
            className="flex w-full flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (label.trim()) create.mutate();
            }}
          >
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={t("customer-schema.label")}
              className="w-56"
            />
            <Button type="submit" disabled={!label.trim() || create.isPending}>
              <Plus />
              {t("customer-schema.create-new-ttribute")}
            </Button>
            {order && (
              <Button
                type="button"
                variant="outline"
                className="ms-auto"
                disabled={saveOrder.isPending}
                onClick={() => saveOrder.mutate()}
              >
                {t("customer-schema.save-order")}
              </Button>
            )}
          </form>
        )
      }
    >
      <DataTable>
        <thead>
          <tr>
            <Th>{t("customer-schema.label")}</Th>
            <Th>{t("customer-schema.type")}</Th>
            <Th>{t("customer-schema.mandatory")}</Th>
            <Th>{t("customer-schema.PII")}</Th>
            <Th>{t("customer-schema.searchable")}</Th>
            {canManage && <Th />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <EmptyRow>
              <EmptyState
                icon={ListTree}
                title={query.isLoading ? t("globals.loading") : t("globals.no-data-available")}
              />
            </EmptyRow>
          )}
          {rows.map((attribute, index) => (
            <tr key={attribute._id ?? attribute.key}>
              <Td>
                <div className="font-medium">{attribute.label}</div>
                <div className="text-xs text-muted-foreground">{attribute.key}</div>
              </Td>
              <Td>
                <Badge variant="secondary">{attribute.type}</Badge>
              </Td>
              <Td>
                {attribute.isRequired ? (
                  <Badge variant="secondary">{t("customer-schema.yes")}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Td>
              <Td>
                {attribute.isPii ? (
                  <Badge variant="outline">{t("customer-schema.PII")}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Td>
              <Td>
                {attribute.isSearchAble ? (
                  <Badge variant="secondary">{t("customer-schema.yes")}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Td>
              {canManage && (
                <Td>
                  <div className="flex justify-end gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("customer-schema.edit")}
                          onClick={() => openEdit(attribute)}
                        >
                          <Pencil />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("customer-schema.edit")}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                          aria-label={t("globals.ascending")}
                        >
                          <ChevronUp />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("globals.ascending")}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={index === rows.length - 1}
                          onClick={() => move(index, 1)}
                          aria-label={t("globals.decending")}
                        >
                          <ChevronDown />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("globals.decending")}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={attribute.isDeleteAble === false}
                          aria-label={t("customer-schema.delete")}
                          onClick={() => {
                            void confirm({ title: t("customer-schema.delete"), destructive: true }).then(
                              async (ok) => {
                                if (!ok || !attribute._id) return;
                                await cimCustomerApi.delete(`/customerSchema/${attribute._id}`);
                                toast.success(t("customer-schema.delete"));
                                await refresh();
                              },
                            );
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("customer-schema.delete")}</TooltipContent>
                    </Tooltip>
                  </div>
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </DataTable>

      <Dialog
        open={Boolean(editing && editDraft)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setEditDraft(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("customer-schema.edit-attribute")}</DialogTitle>
          </DialogHeader>
          {editDraft && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="schema-label">{t("customer-schema.label")}</Label>
                <Input
                  id="schema-label"
                  value={editDraft.label ?? ""}
                  onChange={(event) =>
                    setEditDraft((current) => (current ? { ...current, label: event.target.value } : current))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="schema-description">{t("customer-schema.description")}</Label>
                <Input
                  id="schema-description"
                  value={editDraft.description ?? ""}
                  onChange={(event) =>
                    setEditDraft((current) =>
                      current ? { ...current, description: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="schema-default">{t("customer-schema.default-value")}</Label>
                <Input
                  id="schema-default"
                  value={editDraft.defaultValue ?? ""}
                  onChange={(event) =>
                    setEditDraft((current) =>
                      current ? { ...current, defaultValue: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={Boolean(editDraft.isRequired)}
                    onCheckedChange={(checked) =>
                      setEditDraft((current) => (current ? { ...current, isRequired: checked } : current))
                    }
                  />
                  {t("customer-schema.mandatory")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={Boolean(editDraft.isPii)}
                    onCheckedChange={(checked) =>
                      setEditDraft((current) => (current ? { ...current, isPii: checked } : current))
                    }
                  />
                  {t("customer-schema.PII")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={Boolean(editDraft.isSearchAble)}
                    onCheckedChange={(checked) =>
                      setEditDraft((current) => (current ? { ...current, isSearchAble: checked } : current))
                    }
                  />
                  {t("customer-schema.searchable")}
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setEditDraft(null);
              }}
            >
              {t("customer-schema.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!editDraft?.label?.trim() || update.isPending}
              onClick={() => update.mutate()}
            >
              {t("customer-schema.update-attribute")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DataView>
  );
}
