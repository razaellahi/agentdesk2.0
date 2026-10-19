import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Loader2, Plus, Route, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import {
  caseKeys,
  createCase,
  fetchCategories,
  fetchSlaThresholds,
  resolveRouting,
  type DirectoryUser,
} from "../api";
import { AttachmentDropzone, PendingUploadList } from "../components/AttachmentUpload";
import { useAttachmentUploads } from "../hooks/useAttachmentUploads";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { useDistributionPolicy } from "../hooks/useCaseSession";
import {
  interactionHref,
  isInteractionUrl,
  pickInteractionIdForApi,
  type SelectedCustomer,
} from "../model/customer";
import { directoryName as assigneeName } from "../model/format";
import { AssigneePicker } from "./AssigneePicker";
import { CustomerPicker } from "./CustomerPicker";

const PRIORITY_OPTIONS = [
  { value: "Critical", code: "P1", sla: "30m" },
  { value: "High", code: "P2", sla: "4h" },
  { value: "Medium", code: "P3", sla: "24h" },
  { value: "Low", code: "P4", sla: "5d" },
] as const;

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function ReviewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** Standalone case creation (case-create.component.ts): Details → Classification → Review. */
export default function CreateCasePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draftId] = useState(() => `case-draft-${crypto.randomUUID()}`);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [customer, setCustomer] = useState<SelectedCustomer | null>(null);
  const [assignee, setAssignee] = useState<DirectoryUser | null>(null);
  const [interactions, setInteractions] = useState<{ id: string; value: string }[]>(() => [
    { id: crypto.randomUUID(), value: "" },
  ]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploads = useAttachmentUploads();

  const policy = useDistributionPolicy();
  const assigneeEnabled = policy.data?.createAssigneeEnabled ?? false;
  const categories = useQuery({ queryKey: caseKeys.categories, queryFn: fetchCategories, staleTime: 60_000 });
  const thresholds = useQuery({
    queryKey: caseKeys.slaThresholds,
    queryFn: fetchSlaThresholds,
    staleTime: 60_000,
  });
  const slaTierNames = [
    ...new Set(
      (thresholds.data ?? []).map((row) => row.customerTier?.trim()).filter((v): v is string => Boolean(v)),
    ),
  ];
  const routing = useQuery({
    queryKey: ["cases", "resolve-routing", categoryId, subCategoryId],
    queryFn: () => resolveRouting(categoryId, subCategoryId),
    enabled: Boolean(categoryId && subCategoryId),
  });
  const routingPreview = categoryId && subCategoryId ? (routing.data ?? null) : null;

  const category = categories.data?.find((c) => c.id === categoryId);
  const subCategory = category?.subCategories.find((s) => s.id === subCategoryId);
  const categoryLabel = category && subCategory ? `${category.name} → ${subCategory.name}` : null;
  const interactionValues = interactions.map((row) => row.value.trim()).filter(Boolean);
  const assigneeLabel = assignee ? assigneeName(assignee) : t("cases.create.assignee-policy");
  const sourceLabel =
    routingPreview?.source === "ROUTING_RULE"
      ? t("cases.create.source-rule")
      : routingPreview?.source === "DEFAULT"
        ? t("cases.create.source-default")
        : routingPreview?.source === "NONE"
          ? t("cases.create.source-none")
          : "";

  const steps = [
    t("cases.create.step-details"),
    t("cases.create.step-classification"),
    t("cases.create.step-review"),
  ];
  const canAdvance = (index: number) =>
    index === 0 ? Boolean(title.trim()) : index === 1 ? Boolean(categoryId && subCategoryId) : true;

  const create = useMutation({
    mutationFn: () =>
      createCase({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        customerProfileId: customer?.profileId ?? null,
        ...(customer?.slaTier ? { customerTier: customer.slaTier } : {}),
        interactionId: pickInteractionIdForApi(interactionValues),
        ...(categoryId && subCategoryId ? { categoryId, subCategoryId } : {}),
        ...(assignee && assigneeEnabled ? { assignedUserId: assignee.userId } : {}),
        ...(uploads.refs.length ? { attachments: uploads.refs } : {}),
      }),
    onMutate: () => setError(null),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ["cases", "list"] });
      void navigate(`/cases?caseId=${encodeURIComponent(created.id)}`);
    },
    onError: (cause: Error) => setError(cause.message || t("cases.create.failed")),
  });

  const onCreate = () => {
    if (!title.trim() || create.isPending) return;
    if (uploads.uploading) return setError(t("cases.create.wait-uploads"));
    if (uploads.failed) return setError(t("cases.create.fix-uploads"));
    setConfirming(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <nav className="text-xs text-muted-foreground" aria-label={t("cases.breadcrumb")}>
          <Link to="/cases" className="hover:text-primary hover:underline">
            {t("nav.cases-workbench")}
          </Link>
          <span> / {t("cases.create.title")}</span>
        </nav>
        <div>
          <h1 className="text-xl font-semibold">{t("cases.create.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("cases.create.description")}</p>
        </div>

        <ol className="flex items-center gap-2" aria-label={t("cases.create.steps")}>
          {steps.map((label, index) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(index)}
                aria-current={step === index ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium",
                  step === index
                    ? "text-primary"
                    : step > index
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border text-[11px]",
                    step === index && "border-primary bg-primary text-primary-foreground",
                    step > index && "border-success bg-success-soft text-success-text",
                  )}
                >
                  {step > index ? <Check className="size-3.5" /> : index + 1}
                </span>
                {label}
              </button>
              {index < steps.length - 1 && (
                <span className={cn("h-px flex-1", step > index ? "bg-success" : "bg-border")} />
              )}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <Card title={t("cases.create.case-details")}>
            <div className="space-y-1.5">
              <Label htmlFor="case-title">{t("cases.create.title-field")}</Label>
              <Input
                id="case-title"
                value={title}
                maxLength={255}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
              <p className="text-end text-xs text-muted-foreground tabular-nums">{title.length}/255</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-description">{t("cases.description")}</Label>
              <Textarea
                id="case-description"
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t("cases.create.priority")}</p>
              <div
                role="radiogroup"
                aria-label={t("cases.create.priority")}
                className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={priority === option.value}
                    onClick={() => setPriority(option.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium",
                      priority === option.value
                        ? "bg-surface text-foreground shadow-xs"
                        : "text-muted-foreground",
                    )}
                  >
                    {option.code} {t(`cases.priority.${option.value.toLowerCase()}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("cases.create.sla-target", {
                  target: PRIORITY_OPTIONS.find((p) => p.value === priority)?.sla ?? "—",
                })}
              </p>
            </div>
          </Card>
        )}

        {step === 1 && (
          <>
            <Card title={t("cases.create.classification")} note={t("cases.create.classification-note")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("cases.category")}</Label>
                  <Select
                    value={categoryId}
                    onValueChange={(value) => {
                      setCategoryId(value);
                      setSubCategoryId("");
                      setAssignee(null);
                    }}
                  >
                    <SelectTrigger className="w-full" aria-label={t("cases.category")}>
                      <SelectValue placeholder={t("cases.create.select-category")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categories.isError && (
                    <p className="text-xs text-destructive-text">{t("cases.create.categories-failed")}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("cases.sub-category")}</Label>
                  <Select
                    value={subCategoryId}
                    disabled={!categoryId}
                    onValueChange={(value) => {
                      setSubCategoryId(value);
                      setAssignee(null);
                    }}
                  >
                    <SelectTrigger className="w-full" aria-label={t("cases.sub-category")}>
                      <SelectValue placeholder={t("cases.create.select-sub-category")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(category?.subCategories ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {routingPreview && (
                <div className="flex items-center gap-2 rounded-lg bg-primary-soft/50 px-3 py-2 text-sm">
                  <Route className="size-4 text-primary" aria-hidden />
                  <span className="text-muted-foreground">{t("cases.create.resolved-group")}</span>
                  <strong>{routingPreview.keycloakGroupId ?? "—"}</strong>
                  <span className="text-xs text-muted-foreground">({sourceLabel})</span>
                </div>
              )}
              {assigneeEnabled && (
                <div className="space-y-1.5 border-t border-border pt-3">
                  <Label>{t("cases.assignee")}</Label>
                  <p className="text-xs text-muted-foreground">{t("cases.create.assignee-note")}</p>
                  <AssigneePicker
                    groupKey={routingPreview?.keycloakGroupId ?? null}
                    value={assignee}
                    onChange={setAssignee}
                  />
                </div>
              )}
            </Card>

            <Card title={t("cases.attachments")} note={t("cases.create.attachments-note")}>
              <AttachmentDropzone
                onFiles={(files) =>
                  uploads.add(files, { draftId, customerProfileId: customer?.profileId ?? null })
                }
              />
              <PendingUploadList files={uploads.files} onRemove={uploads.remove} />
            </Card>

            <Card title={t("cases.customer")} note={t("cases.create.customer-note")}>
              <CustomerPicker value={customer} onChange={setCustomer} slaTierNames={slaTierNames} />
              {customer?.slaTier && (
                <p className="text-xs">
                  <span className="text-muted-foreground">{t("cases.create.sla-tier")}: </span>
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 font-medium text-primary">
                    {customer.slaTier}
                  </span>
                </p>
              )}
            </Card>

            <Card title={t("cases.create.interactions")} note={t("cases.create.interactions-note")}>
              <ul className="space-y-2">
                {interactions.map((row, index) => (
                  <li key={row.id} className="flex items-center gap-2">
                    <Input
                      value={row.value}
                      placeholder={t("cases.create.interaction-placeholder")}
                      aria-label={t("cases.create.interaction-n", { n: index + 1 })}
                      onChange={(event) =>
                        setInteractions((list) =>
                          list.map((r) => (r.id === row.id ? { ...r, value: event.target.value } : r)),
                        )
                      }
                    />
                    {isInteractionUrl(row.value) && (
                      <a
                        href={interactionHref(row.value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" /> {t("cases.create.open")}
                      </a>
                    )}
                    {interactions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("cases.create.remove-interaction", { n: index + 1 })}
                        onClick={() => setInteractions((list) => list.filter((r) => r.id !== row.id))}
                      >
                        <X />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInteractions((list) => [...list, { id: crypto.randomUUID(), value: "" }])}
              >
                <Plus />
                {t("cases.create.add-interaction")}
              </Button>
            </Card>
          </>
        )}

        {step === 2 && (
          <Card title={t("cases.create.review")}>
            <dl>
              <ReviewRow label={t("cases.create.title-field")}>{title}</ReviewRow>
              <ReviewRow label={t("cases.create.priority")}>
                <PriorityBadge priority={priority} variant="tag" />
              </ReviewRow>
              <ReviewRow label={t("cases.category")}>{categoryLabel ?? "—"}</ReviewRow>
              <ReviewRow label={t("cases.create.routing")}>
                {routingPreview?.keycloakGroupId || t("cases.create.auto")}
              </ReviewRow>
              {assigneeEnabled && <ReviewRow label={t("cases.assignee")}>{assigneeLabel}</ReviewRow>}
              <ReviewRow label={t("cases.customer")}>
                {customer?.displayName || "—"}
                {customer?.slaTier && (
                  <span className="ms-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">
                    {customer.slaTier}
                  </span>
                )}
              </ReviewRow>
            </dl>
          </Card>
        )}

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {t("cases.create.on-create")} <StatusBadge label={t("cases.status.new")} code="NEW" />
        </p>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive-text">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/cases">{t("cases.cancel")}</Link>
          </Button>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              {t("cases.back")}
            </Button>
          )}
          {step < 2 ? (
            <Button disabled={!canAdvance(step)} onClick={() => setStep((s) => s + 1)}>
              {t("cases.next")}
            </Button>
          ) : (
            <Button disabled={!title.trim() || create.isPending} onClick={onCreate}>
              {create.isPending && <Loader2 className="animate-spin" />}
              {t("cases.create.title")}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("cases.create.confirm-title")}</DialogTitle>
            <DialogDescription>{t("cases.create.confirm-intro")}</DialogDescription>
          </DialogHeader>
          <dl className="max-h-[55vh] overflow-y-auto">
            <ReviewRow label={t("cases.create.title-field")}>{title.trim()}</ReviewRow>
            <ReviewRow label={t("cases.create.priority")}>
              <PriorityBadge priority={priority} />
            </ReviewRow>
            <ReviewRow label={t("cases.status-label")}>
              <StatusBadge label={t("cases.status.new")} code="NEW" />
            </ReviewRow>
            {categoryLabel && <ReviewRow label={t("cases.category")}>{categoryLabel}</ReviewRow>}
            {routingPreview?.keycloakGroupId && (
              <ReviewRow label={t("cases.create.auto-routed")}>{routingPreview.keycloakGroupId}</ReviewRow>
            )}
            <ReviewRow label={t("cases.assignee")}>
              {assigneeEnabled ? assigneeLabel : t("cases.create.assignee-policy")}
            </ReviewRow>
            <ReviewRow label={t("cases.customer")}>
              {customer
                ? `${customer.displayName}${customer.labelNames.length ? ` · ${customer.labelNames.join(", ")}` : ""}`
                : "—"}
            </ReviewRow>
            {interactionValues.length > 0 && (
              <ReviewRow label={t("cases.create.interactions")}>
                <ul className="space-y-0.5">
                  {interactionValues.map((item) => (
                    <li key={item}>
                      {isInteractionUrl(item) ? (
                        <a
                          href={interactionHref(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {item}
                        </a>
                      ) : (
                        item
                      )}
                    </li>
                  ))}
                </ul>
              </ReviewRow>
            )}
            {description.trim() && (
              <ReviewRow label={t("cases.description")}>
                <span className="whitespace-pre-wrap">{description.trim()}</span>
              </ReviewRow>
            )}
            {uploads.refs.length > 0 && (
              <ReviewRow label={t("cases.attachments")}>
                {t("cases.create.n-files", { count: uploads.refs.length })}
              </ReviewRow>
            )}
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {t("cases.cancel")}
            </Button>
            <Button
              onClick={() => {
                setConfirming(false);
                create.mutate();
              }}
            >
              {t("cases.create.title")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
