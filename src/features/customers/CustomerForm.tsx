import { Plus, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cimCustomerApi } from "@/core/api";
import { usePermission } from "@/core/auth";
import { unwrapList } from "@/shared/lib/unwrap";
import { createCustomer, updateCustomer } from "./api";
import { refreshConversationCustomer } from "@/features/workspace";
import { LabelPicker, labelIds } from "./LabelPicker";
import {
  attributeLength,
  isNumericAttribute,
  validateAttribute,
  type AttributeType,
} from "./attributeValidation";

type CustomerDraft = { _id?: string } & Record<string, unknown>;

interface Attribute {
  key?: string;
  label?: string;
  type?: string;
  isRequired?: boolean;
  isChannelIdentifier?: boolean;
  defaultValue?: string;
  length?: number | string;
  valueType?: string;
  channelTypes?: { name?: string }[] | string[];
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value == null || value === "") return [""];
  return [String(value)];
}

function channelTypeNames(attr: Attribute): string[] {
  return (attr.channelTypes ?? [])
    .map((item) => (typeof item === "string" ? item : String(item?.name ?? "")))
    .filter(Boolean);
}

export function CustomerForm({
  customer,
  conversationId,
  onClose,
}: {
  customer: CustomerDraft | null;
  conversationId?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const fieldId = useId();
  const queryClient = useQueryClient();
  const schema = useQuery({
    queryKey: ["customer-schema"],
    queryFn: async () => unwrapList<Attribute>(await cimCustomerApi.get("/customerSchema")),
  });

  const types = useQuery({
    queryKey: ["customer-attribute-types"],
    queryFn: async () => unwrapList<AttributeType>(await cimCustomerApi.get("/attributeTypes")),
  });

  // Labels are their own field (a picker of label ids), never a text box.
  const labelsField = useMemo(
    () => (schema.data ?? []).find((field) => field.key === "labels"),
    [schema.data],
  );
  const canAssignLabels = usePermission("customerLabels");
  const attributes = useMemo(
    () =>
      (schema.data ?? []).filter(
        (field) => field.key && field.key !== "isAnonymous" && field.key !== "labels",
      ),
    [schema.data],
  );
  const scalarFields = useMemo(() => attributes.filter((field) => !field.isChannelIdentifier), [attributes]);
  const channelFields = useMemo(() => attributes.filter((field) => field.isChannelIdentifier), [attributes]);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    if (customer) {
      for (const [key, value] of Object.entries(customer)) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          seed[key] = String(value);
        }
      }
    }
    return seed;
  });

  const [channelValues, setChannelValues] = useState<Record<string, string[]>>({});
  const savedLabels = useMemo(() => labelIds(customer?.labels), [customer]);
  const [pickedLabels, setPickedLabels] = useState<string[] | null>(null);
  const labelsNow = pickedLabels ?? savedLabels;
  const changed =
    (pickedLabels !== null &&
      JSON.stringify([...pickedLabels].sort()) !== JSON.stringify([...savedLabels].sort())) ||
    scalarFields.some(
      (field) =>
        field.key &&
        values[field.key] !== undefined &&
        values[field.key] !== String(customer?.[field.key] ?? field.defaultValue ?? ""),
    ) ||
    channelFields.some(
      (field) =>
        field.key &&
        channelValues[field.key] !== undefined &&
        JSON.stringify(channelValues[field.key]!.map((v) => v.trim()).filter(Boolean)) !==
          JSON.stringify(
            asStringList(customer?.[field.key] ?? field.defaultValue)
              .map((v) => v.trim())
              .filter(Boolean),
          ),
    );
  const requestClose = () => {
    if (save.isPending) return;
    if (!changed) onClose();
    else
      void confirm({ title: "Discard unsaved customer changes?", destructive: true }).then((ok) => {
        if (ok) onClose();
      });
  };

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      if (!attributes.length || schema.isError || types.isError || !types.data)
        throw new Error("Customer schema validation is unavailable.");
      for (const field of scalarFields) {
        if (!field.key) continue;
        const raw = values[field.key] ?? String(customer?.[field.key] ?? field.defaultValue ?? "");
        if (field.type?.toLowerCase() === "boolean") body[field.key] = raw === "true";
        else if (isNumericAttribute(field, types.data)) body[field.key] = raw === "" ? null : Number(raw);
        else body[field.key] = raw.trim();
        if (typeof body[field.key] === "number" && !Number.isFinite(body[field.key]))
          throw new Error(`${field.label ?? field.key} must be a valid number.`);
      }
      for (const field of channelFields) {
        if (!field.key) continue;
        body[field.key] = (
          channelValues[field.key] ?? asStringList(customer?.[field.key] ?? field.defaultValue)
        )
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 10);
      }
      for (const field of attributes) {
        const value = body[field.key!];
        const error = validateAttribute(field, value, types.data);
        if (error) throw new Error(error);
      }
      // Always sent as ids, so saving the other fields never drops the customer's labels.
      if (labelsField) body.labels = labelsNow;
      if (customer && "isAnonymous" in customer) body.isAnonymous = customer.isAnonymous;
      return customer?._id ? updateCustomer(customer._id, body, conversationId) : createCustomer(body);
    },
    onSuccess: async () => {
      toast.success(t(customer ? "snackbar.Customer-updated!" : "snackbar.New-Customer-Created"));
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (customer?._id)
        await refreshConversationCustomer(customer._id, conversationId).catch(() => undefined);
      onClose();
    },
    onError: (error: unknown) => toast.error(String(error)),
  });

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <SheetContent side="right" size="lg" className="gap-0 p-0">
        <SheetHeader>
          <SheetTitle>
            {t(customer ? "customer-actions.edit-customer" : "create-customer.create-new-customer")}
          </SheetTitle>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <SheetBody className="grid gap-4 sm:grid-cols-2">
            <fieldset disabled={save.isPending} className="contents">
              {schema.isLoading &&
                Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-14 rounded-xl sm:col-span-2" />
                ))}
              {schema.isError && (
                <p role="alert" className="text-destructive sm:col-span-2">
                  {schema.error.message}
                  <Button type="button" variant="ghost" onClick={() => void schema.refetch()}>
                    Retry
                  </Button>
                </p>
              )}
              {types.isError && (
                <p role="alert" className="text-sm text-destructive-text sm:col-span-2">
                  {types.error.message}
                  <Button type="button" variant="ghost" onClick={() => void types.refetch()}>
                    Retry validation rules
                  </Button>
                </p>
              )}
              {scalarFields.map((field, index) => (
                <label
                  key={field.key}
                  htmlFor={`${fieldId}-${field.key}`}
                  className={`desk-msg-in grid gap-1.5 text-sm ${field.type?.toLowerCase() === "boolean" ? "sm:col-span-2" : ""}`}
                  style={{ animationDelay: `${Math.min(index, 10) * 28}ms` }}
                >
                  <span className="font-medium">
                    {field.label}
                    {field.isRequired ? <span className="text-destructive"> *</span> : ""}
                  </span>
                  {field.type?.toLowerCase() === "boolean" ? (
                    <span className="flex items-center gap-2">
                      <Checkbox
                        id={`${fieldId}-${field.key}`}
                        aria-label={field.label}
                        checked={
                          (values[field.key ?? ""] ??
                            String(customer?.[field.key ?? ""] ?? field.defaultValue ?? "")) === "true"
                        }
                        onCheckedChange={(checked) =>
                          setValues((current) => ({
                            ...current,
                            [field.key ?? ""]: checked ? "true" : "false",
                          }))
                        }
                      />
                      <Label htmlFor={`${fieldId}-${field.key}`}>{field.label}</Label>
                    </span>
                  ) : (
                    <Input
                      id={`${fieldId}-${field.key}`}
                      required={field.isRequired}
                      maxLength={attributeLength(field)}
                      type={
                        isNumericAttribute(field, types.data ?? [])
                          ? "number"
                          : field.type?.toLowerCase() === "email"
                            ? "email"
                            : "text"
                      }
                      step={field.type?.toLowerCase() === "integer" ? 1 : "any"}
                      value={
                        values[field.key ?? ""] ??
                        String(customer?.[field.key ?? ""] ?? field.defaultValue ?? "")
                      }
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.key ?? ""]: event.target.value }))
                      }
                    />
                  )}
                </label>
              ))}

              {labelsField && canAssignLabels && (
                <div className="grid gap-1.5 text-sm sm:col-span-2">
                  <span className="font-medium">
                    {labelsField.label}
                    {labelsField.isRequired ? <span className="text-destructive"> *</span> : ""}
                  </span>
                  <LabelPicker value={labelsNow} onChange={setPickedLabels} disabled={save.isPending} />
                </div>
              )}

              {channelFields.length > 0 && (
                <div className="space-y-3 border-t border-border/50 pt-4 sm:col-span-2">
                  <p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("chat-features.customer-info.channel-identifiers")}
                  </p>
                  {channelFields.map((field) => {
                    const key = field.key!;
                    const rows = channelValues[key] ?? asStringList(customer?.[key] ?? field.defaultValue);
                    const types = channelTypeNames(field);
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {field.label}
                            {types.length > 0 && (
                              <span className="ms-2 text-xs font-normal text-muted-foreground">
                                ({types.join(", ")})
                              </span>
                            )}
                            {field.isRequired ? <span className="text-destructive"> *</span> : ""}
                          </span>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t("customer-schema.add")}
                            disabled={rows.length >= 10}
                            onClick={() =>
                              setChannelValues((current) => ({
                                ...current,
                                [key]: [...(current[key] ?? rows), ""],
                              }))
                            }
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                        {rows.map((value, index) => (
                          <div key={`${key}-${index}`} className="flex items-center gap-1">
                            <Input
                              aria-label={`${field.label ?? key} ${index + 1}`}
                              type={field.type?.toLowerCase() === "email" ? "email" : "text"}
                              required={field.isRequired && index === 0}
                              value={value}
                              onChange={(event) =>
                                setChannelValues((current) => {
                                  const next = [...(current[key] ?? rows)];
                                  next[index] = event.target.value;
                                  return { ...current, [key]: next };
                                })
                              }
                            />
                            {index > 0 && (
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label={t("globals.delete")}
                                onClick={() =>
                                  setChannelValues((current) => ({
                                    ...current,
                                    [key]: (current[key] ?? rows).filter((_, i) => i !== index),
                                  }))
                                }
                              >
                                <X className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </fieldset>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={requestClose}>
              {t("create-customer.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                save.isPending || !attributes.length || schema.isError || types.isPending || types.isError
              }
            >
              {t(customer ? "customer-actions.save" : "create-customer.create")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
