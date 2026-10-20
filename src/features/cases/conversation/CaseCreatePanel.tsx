import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CheckCircle2, Copy, Info, Loader2, Route } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  caseKeys,
  createCaseFromConversation,
  fetchCategories,
  resolveRouting,
  type CaseSummary,
} from "../api";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { PRIORITIES } from "../model/format";
import { NativeSelect, FieldLabel } from "../components/Fields";
import type { CaseConversationContext } from "./CasesTab";

/** Create a case from the active conversation (widget create-case.component.ts). */
export function CaseCreatePanel({
  context,
  onBack,
  onOpen,
}: {
  context: CaseConversationContext;
  onBack: () => void;
  onOpen: (caseId: string) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [created, setCreated] = useState<CaseSummary | null>(null);
  const [copied, setCopied] = useState<"ref" | "id" | null>(null);

  const categories = useQuery({ queryKey: caseKeys.categories, queryFn: fetchCategories, staleTime: 60_000 });
  // Only categories that can actually be picked down to a sub-category.
  const options = (categories.data ?? []).filter((c) => c.subCategories.length > 0);
  const category = options.find((c) => c.id === categoryId);
  const routing = useQuery({
    queryKey: ["cases", "resolve-routing", categoryId, subCategoryId],
    queryFn: () => resolveRouting(categoryId, subCategoryId),
    enabled: Boolean(categoryId && subCategoryId),
  });

  const create = useMutation({
    mutationFn: () =>
      createCaseFromConversation({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        categoryId,
        subCategoryId,
        customerProfileId: context.customerProfileId,
        interactionId: context.interactionId,
        customerName: context.customerName,
        agentName: context.agentName,
        channel: context.channel,
      }),
    onSuccess: (row) => {
      setCreated(row);
      if (context.interactionId)
        void queryClient.invalidateQueries({ queryKey: caseKeys.interaction(context.interactionId) });
      void queryClient.invalidateQueries({ queryKey: ["cases", "customer"] });
      void queryClient.invalidateQueries({ queryKey: ["cases", "list"] });
    },
  });

  const createAnother = () => {
    setCreated(null);
    setCopied(null);
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setCategoryId("");
    setSubCategoryId("");
    create.reset();
  };

  const copy = async (value: string, field: "ref" | "id") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      setTimeout(() => setCopied((current) => (current === field ? null : current)), 2000);
    } catch {
      setCopied(null);
    }
  };

  const header = (
    <div className="flex items-center gap-2">
      <Button
        size="icon-xs"
        variant="ghost"
        className="size-7 rounded-full"
        onClick={onBack}
        aria-label={t("cases.conversation.back")}
      >
        <ArrowLeft className="size-4" />
      </Button>
      <h4 className="text-sm font-semibold">
        {created ? t("cases.conversation.created") : t("cases.create.title")}
      </h4>
    </div>
  );

  if (created) {
    const routed = created.assignedGroupId ?? "—";
    return (
      <div className="space-y-3 px-3.5 py-3">
        {header}
        <section className="space-y-3 rounded-xl border border-success/40 bg-success-soft/40 p-3 text-center">
          <CheckCircle2 className="mx-auto size-8 text-success-text" aria-hidden />
          <div className="flex items-center justify-center gap-2">
            <p className="font-mono text-sm font-semibold">{created.caseReferenceId}</p>
            <Button size="xs" variant="ghost" onClick={() => void copy(created.caseReferenceId, "ref")}>
              {copied === "ref" ? <Check /> : <Copy />}
              {copied === "ref" ? t("cases.conversation.copied") : t("cases.conversation.copy")}
            </Button>
          </div>
          <div className="flex justify-center gap-2">
            <Button size="sm" onClick={() => onOpen(created.id)}>
              {t("cases.conversation.open-case")}
            </Button>
            <Button size="sm" variant="outline" onClick={onBack}>
              {t("cases.conversation.view-all")}
            </Button>
            <Button size="sm" variant="outline" onClick={createAnother}>
              {t("cases.conversation.create-another")}
            </Button>
          </div>
        </section>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-foreground/70">{t("cases.status-label")}</dt>
            <dd>
              <StatusBadge
                label={created.status.label}
                code={created.status.code}
                category={created.status.statusCategory}
              />
            </dd>
          </div>
          <div>
            <dt className="text-foreground/70">{t("cases.create.priority")}</dt>
            <dd>
              <PriorityBadge priority={created.priority} />
            </dd>
          </div>
          {created.category && (
            <div>
              <dt className="text-foreground/70">{t("cases.category")}</dt>
              <dd>
                {created.category.name}
                {created.subCategory ? ` / ${created.subCategory.name}` : ""}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-foreground/70">{t("cases.conversation.routed-group")}</dt>
            <dd>{routed}</dd>
          </div>
        </dl>
        <details className="text-xs">
          <summary className="cursor-pointer text-foreground/70">{t("cases.conversation.technical")}</summary>
          <dl className="mt-2 space-y-1 font-mono">
            <div className="flex items-center gap-2">
              <dt className="text-foreground/70">{t("cases.conversation.case-id")}</dt>
              <dd className="truncate">{created.id}</dd>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => void copy(created.id, "id")}
                aria-label={t("cases.conversation.copy-id")}
              >
                {copied === "id" ? <Check /> : <Copy />}
              </Button>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground/70">{t("cases.conversation.interaction")}</dt>
              <dd className="truncate">
                {created.conversations[0]?.interactionId ?? context.interactionId ?? "—"}
              </dd>
            </div>
          </dl>
        </details>
      </div>
    );
  }

  const sourceLabel =
    routing.data?.source === "ROUTING_RULE"
      ? t("cases.conversation.source-rule")
      : routing.data?.source === "DEFAULT"
        ? t("cases.create.source-default")
        : t("cases.conversation.source-none");
  const valid = Boolean(title.trim() && priority && categoryId && subCategoryId);

  return (
    <form
      className="space-y-3 px-3.5 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !create.isPending) create.mutate();
      }}
    >
      {header}
      {(categories.error || create.error) && (
        <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-xs text-destructive-text">
          {(create.error ?? categories.error)?.message}
        </p>
      )}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="conv-case-title">
          {t("cases.create.title-field")} <span className="text-destructive-text">*</span>
        </FieldLabel>
        <Input
          id="conv-case-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={create.isPending}
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="conv-case-description">{t("cases.description")}</FieldLabel>
        <Textarea
          id="conv-case-description"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={create.isPending}
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="conv-case-priority">
          {t("cases.create.priority")} <span className="text-destructive-text">*</span>
        </FieldLabel>
        <NativeSelect
          id="conv-case-priority"
          className="w-full"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {t(`cases.priority.${p.toLowerCase()}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="conv-case-category">
          {t("cases.category")} <span className="text-destructive-text">*</span>
        </FieldLabel>
        <NativeSelect
          id="conv-case-category"
          className="w-full"
          value={categoryId}
          disabled={categories.isPending}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setSubCategoryId("");
          }}
        >
          <option value="">{t("cases.conversation.select-category")}</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="conv-case-sub">
          {t("cases.sub-category")} <span className="text-destructive-text">*</span>
        </FieldLabel>
        <NativeSelect
          id="conv-case-sub"
          className="w-full"
          value={subCategoryId}
          disabled={!category}
          onChange={(event) => setSubCategoryId(event.target.value)}
        >
          <option value="">{t("cases.conversation.select-sub-category")}</option>
          {(category?.subCategories ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      {routing.data?.keycloakGroupId && (
        <p className="flex items-center gap-2 rounded-lg bg-primary-soft/50 px-3 py-2 text-xs">
          <Route className="size-3.5 shrink-0 text-primary" aria-hidden />
          {t("cases.conversation.auto-routed", { group: routing.data.keycloakGroupId, source: sourceLabel })}
        </p>
      )}
      <p className="flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground/70">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          {!context.interactionId
            ? t("cases.conversation.context-customer-only", { name: context.customerName ?? "—" })
            : context.customerName
              ? t("cases.conversation.context-named", { name: context.customerName })
              : t("cases.conversation.context-unnamed")}
        </span>
      </p>
      <Button type="submit" className="w-full" disabled={!valid || create.isPending || categories.isPending}>
        {create.isPending && <Loader2 className="animate-spin" />}
        {create.isPending ? t("cases.saving") : t("cases.create.title")}
      </Button>
    </form>
  );
}
