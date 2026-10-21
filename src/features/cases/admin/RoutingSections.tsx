import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CloudOff, Loader2, RefreshCw, UsersRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/shared/lib/utils";
import {
  createCategory,
  createSubCategory,
  fetchAdminCategories,
  fetchKeycloakRoutingGroups,
  fetchTenantSettings,
  updateCategory,
  updateSubCategory,
  updateTenantSettings,
  upsertRoutingRule,
  type Category,
  type DistributionMode,
} from "../api";
import { groupSlug } from "../model/format";
import { NativeSelect, FieldLabel } from "../components/Fields";
import { resolveGroupOptionValue } from "../model/routing";
import { AdminCard, AdminFrame, Banner } from "./AdminFrame";

const KEYS = {
  groups: ["cases", "admin", "keycloak-groups"] as const,
  categories: ["cases", "admin", "categories"] as const,
  settings: ["cases", "admin", "tenant-settings"] as const,
};

function RefreshButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  const { t } = useTranslation();
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <RefreshCw className={cn(busy && "animate-spin")} />
      {t("cases.refresh")}
    </Button>
  );
}

function Loading() {
  const { t } = useTranslation();
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {t("cases.loading")}
    </p>
  );
}

// --- Taxonomy

type EditableCategory = Category & { draftSub: string };

export function TaxonomySection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: KEYS.categories, queryFn: fetchAdminCategories });
  const [drafts, setDrafts] = useState<Record<string, Partial<EditableCategory>>>({});
  const [subDrafts, setSubDrafts] = useState<Record<string, { name?: string; isActive?: boolean }>>({});
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onMutate: () => setError(null),
    onSuccess: () => {
      setDrafts({});
      setSubDrafts({});
      void queryClient.invalidateQueries({ queryKey: KEYS.categories });
      void queryClient.invalidateQueries({ queryKey: ["cases", "categories"] });
    },
    onError: (cause: Error) => setError(cause.message),
  });

  const toggle = (id: string) =>
    setExpanded((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <AdminFrame
      title={t("cases.admin.taxonomy.title")}
      description={t("cases.admin.taxonomy.description")}
      actions={<RefreshButton onClick={() => void categories.refetch()} busy={categories.isFetching} />}
    >
      {(error || categories.error) && <Banner tone="error">{error ?? categories.error?.message}</Banner>}
      <AdminCard title={t("cases.admin.taxonomy.add-category")} hint={t("cases.admin.taxonomy.hint")}>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={t("cases.admin.taxonomy.category-name")}
            aria-label={t("cases.admin.taxonomy.category-name")}
            className="max-w-sm"
          />
          <Button
            disabled={run.isPending}
            onClick={() => {
              const name = newName.trim();
              if (!name) return setError(t("cases.admin.taxonomy.category-required"));
              run.mutate(() => createCategory(name), { onSuccess: () => setNewName("") });
            }}
          >
            {t("cases.admin.taxonomy.add-category")}
          </Button>
        </div>
      </AdminCard>
      {categories.isPending ? (
        <Loading />
      ) : (
        <ul className="space-y-3">
          {(categories.data ?? []).map((cat) => {
            const draft = { ...cat, draftSub: "", ...drafts[cat.id] };
            const open = expanded.has(cat.id);
            return (
              <li key={cat.id} className="rounded-2xl border border-border bg-surface">
                <div className="flex flex-wrap items-center gap-2 p-3">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-expanded={open}
                    aria-label={t(open ? "cases.admin.taxonomy.collapse" : "cases.admin.taxonomy.expand", {
                      name: cat.name,
                    })}
                    onClick={() => toggle(cat.id)}
                  >
                    {open ? <ChevronDown /> : <ChevronRight />}
                  </Button>
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                    {t("cases.category")}
                  </span>
                  <Input
                    value={draft.name}
                    aria-label={t("cases.admin.taxonomy.category-name")}
                    className="h-8 max-w-xs flex-1"
                    onChange={(event) =>
                      setDrafts((d) => ({ ...d, [cat.id]: { ...d[cat.id], name: event.target.value } }))
                    }
                  />
                  <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={draft.isActive ?? true}
                      onCheckedChange={(checked) =>
                        setDrafts((d) => ({ ...d, [cat.id]: { ...d[cat.id], isActive: checked === true } }))
                      }
                    />
                    {t("cases.admin.active")}
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ms-auto"
                    disabled={run.isPending}
                    onClick={() =>
                      run.mutate(() =>
                        updateCategory(cat.id, { name: draft.name.trim(), isActive: draft.isActive ?? true }),
                      )
                    }
                  >
                    {t("cases.save")}
                  </Button>
                </div>
                {!open ? (
                  <button
                    type="button"
                    className="w-full border-t border-border px-4 py-2 text-start text-xs text-muted-foreground hover:bg-surface-2/60"
                    onClick={() => toggle(cat.id)}
                  >
                    {t("cases.admin.taxonomy.n-subs", { count: cat.subCategories.length })}
                  </button>
                ) : (
                  <div className="space-y-2 border-t border-border p-3 ps-12">
                    {cat.subCategories.map((sub) => {
                      const subDraft = {
                        name: sub.name,
                        isActive: sub.isActive ?? true,
                        ...subDrafts[sub.id],
                      };
                      return (
                        <div key={sub.id} className="flex flex-wrap items-center gap-2">
                          <Input
                            value={subDraft.name}
                            aria-label={t("cases.admin.taxonomy.sub-name")}
                            className="h-8 max-w-xs flex-1"
                            onChange={(event) =>
                              setSubDrafts((d) => ({
                                ...d,
                                [sub.id]: { ...d[sub.id], name: event.target.value },
                              }))
                            }
                          />
                          <label className="flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={subDraft.isActive}
                              onCheckedChange={(checked) =>
                                setSubDrafts((d) => ({
                                  ...d,
                                  [sub.id]: { ...d[sub.id], isActive: checked === true },
                                }))
                              }
                            />
                            {t("cases.admin.active")}
                          </label>
                          <Button
                            size="sm"
                            variant="outline"
                            className="ms-auto"
                            disabled={run.isPending}
                            onClick={() =>
                              run.mutate(() =>
                                updateSubCategory(sub.id, {
                                  name: subDraft.name.trim(),
                                  isActive: subDraft.isActive,
                                }),
                              )
                            }
                          >
                            {t("cases.save")}
                          </Button>
                        </div>
                      );
                    })}
                    <div className="flex gap-2 pt-1">
                      <Input
                        value={draft.draftSub}
                        placeholder={t("cases.admin.taxonomy.sub-name")}
                        aria-label={t("cases.admin.taxonomy.add-sub")}
                        className="h-8 max-w-xs"
                        onChange={(event) =>
                          setDrafts((d) => ({
                            ...d,
                            [cat.id]: { ...d[cat.id], draftSub: event.target.value },
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={run.isPending}
                        onClick={() => {
                          const name = draft.draftSub.trim();
                          if (!name) return setError(t("cases.admin.taxonomy.sub-required"));
                          run.mutate(() => createSubCategory(cat.id, name));
                        }}
                      >
                        {t("cases.add")}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AdminFrame>
  );
}

// --- Group mapping

export function MappingSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const groupsQuery = useQuery({ queryKey: KEYS.groups, queryFn: fetchKeycloakRoutingGroups });
  const categories = useQuery({ queryKey: KEYS.categories, queryFn: fetchAdminCategories });
  const settings = useQuery({ queryKey: KEYS.settings, queryFn: fetchTenantSettings });
  const [defaultDraft, setDefaultDraft] = useState<string | null>(null);
  const [ruleDrafts, setRuleDrafts] = useState<Record<string, string>>({});
  const [savingRule, setSavingRule] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const groups = groupsQuery.data?.groups ?? [];
  const status = groupsQuery.data?.status ?? (groupsQuery.isError ? "UNAVAILABLE" : "OK");
  const ready = status === "OK" && groups.length > 0;
  const defaultValue = defaultDraft ?? resolveGroupOptionValue(settings.data?.defaultAssignedGroupId, groups);

  const rows = (categories.data ?? []).flatMap((cat) =>
    cat.subCategories.map((sub) => ({
      categoryId: cat.id,
      categoryName: cat.name,
      subCategoryId: sub.id,
      subCategoryName: sub.name,
      value: ruleDrafts[sub.id] ?? resolveGroupOptionValue(sub.routingRule?.keycloakGroupId, groups),
    })),
  );

  const saveDefault = useMutation({
    mutationFn: () => updateTenantSettings({ defaultAssignedGroupId: defaultValue || null }),
    onMutate: () => setError(null),
    onSuccess: () => {
      setSaved(t("cases.admin.saved"));
      void queryClient.invalidateQueries({ queryKey: KEYS.settings });
    },
    onError: (cause: Error) => setError(cause.message),
  });

  const saveRule = useMutation({
    mutationFn: (row: (typeof rows)[number]) =>
      upsertRoutingRule({
        categoryId: row.categoryId,
        subCategoryId: row.subCategoryId,
        keycloakGroupId: row.value.trim(),
      }),
    onMutate: (row) => {
      setError(null);
      setSaved(null);
      setSavingRule(row.subCategoryId);
    },
    onSettled: () => setSavingRule(null),
    onSuccess: () => {
      setSaved(t("cases.admin.saved"));
      void queryClient.invalidateQueries({ queryKey: KEYS.categories });
    },
    onError: (cause: Error) => setError(cause.message),
  });

  const loading = groupsQuery.isPending || categories.isPending || settings.isPending;
  const groupOptions = groups.map((g) => (
    <option key={g.id} value={groupSlug(g.name)}>
      {g.name}
    </option>
  ));

  return (
    <AdminFrame
      title={t("cases.admin.mapping.title")}
      description={t("cases.admin.mapping.description")}
      actions={
        <RefreshButton
          busy={groupsQuery.isFetching || categories.isFetching}
          onClick={() => {
            void groupsQuery.refetch();
            void categories.refetch();
            void settings.refetch();
          }}
        />
      }
    >
      {(error || categories.error || settings.error) && (
        <Banner tone="error">{error ?? categories.error?.message ?? settings.error?.message}</Banner>
      )}
      {saved && <Banner tone="success">{saved}</Banner>}
      {loading ? (
        <Loading />
      ) : (
        <>
          {status !== "OK" && (
            <Banner tone={status === "EMPTY" ? "warning" : "error"}>
              {status === "EMPTY" ? (
                <UsersRound className="size-4 shrink-0" />
              ) : (
                <CloudOff className="size-4 shrink-0" />
              )}
              <div>
                <strong>{t("cases.admin.mapping.groups-unavailable")}</strong>
                <p>{groupsQuery.data?.message ?? groupsQuery.error?.message}</p>
              </div>
            </Banner>
          )}
          <AdminCard
            title={t("cases.admin.mapping.default")}
            hint={t("cases.admin.mapping.default-hint")}
            className={cn(!ready && "opacity-60")}
          >
            {ready ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-64 flex-1 space-y-1.5">
                  <FieldLabel htmlFor="default-group">{t("cases.routing-group")}</FieldLabel>
                  <NativeSelect
                    id="default-group"
                    className="w-full"
                    value={defaultValue}
                    onChange={(event) => setDefaultDraft(event.target.value)}
                  >
                    <option value="">{t("cases.admin.mapping.none")}</option>
                    {groupOptions}
                  </NativeSelect>
                </div>
                <Button disabled={saveDefault.isPending} onClick={() => saveDefault.mutate()}>
                  {t("cases.admin.mapping.save-default")}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("cases.admin.mapping.create-groups")}</p>
            )}
          </AdminCard>
          <AdminCard
            title={t("cases.admin.mapping.matrix")}
            hint={t("cases.admin.mapping.matrix-hint")}
            className={cn(!ready && "opacity-60")}
          >
            {ready ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="py-2 text-start font-medium">{t("cases.category")}</th>
                      <th className="py-2 text-start font-medium">{t("cases.sub-category")}</th>
                      <th className="py-2 text-start font-medium">{t("cases.routing-group")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.subCategoryId} className="border-b border-border/60">
                        <td className="py-1.5 pe-2">{row.categoryName}</td>
                        <td className="py-1.5 pe-2">{row.subCategoryName}</td>
                        <td className="py-1.5 pe-2">
                          <NativeSelect
                            className="w-full"
                            value={row.value}
                            aria-label={t("cases.admin.mapping.group-for", { name: row.subCategoryName })}
                            onChange={(event) =>
                              setRuleDrafts((d) => ({ ...d, [row.subCategoryId]: event.target.value }))
                            }
                          >
                            <option value="">{t("cases.admin.mapping.select-group")}</option>
                            {groupOptions}
                          </NativeSelect>
                        </td>
                        <td className="py-1.5 text-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingRule === row.subCategoryId}
                            onClick={() => {
                              if (!row.value.trim())
                                return setError(t("cases.admin.mapping.select-group-error"));
                              saveRule.mutate(row);
                            }}
                          >
                            {savingRule === row.subCategoryId ? t("cases.saving") : t("cases.save")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("cases.admin.mapping.configure-first")}</p>
            )}
          </AdminCard>
        </>
      )}
    </AdminFrame>
  );
}

// --- Distribution

export function DistributionSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: KEYS.settings, queryFn: fetchTenantSettings });
  const [draft, setDraft] = useState<{ mode?: DistributionMode; claim?: boolean; assignee?: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const mode = draft.mode ?? settings.data?.distributionMode ?? "MANUAL";
  const claim = draft.claim ?? settings.data?.agentClaimEnabled ?? true;
  const assignee = draft.assignee ?? settings.data?.createAssigneeEnabled ?? false;

  const save = useMutation({
    mutationFn: () =>
      updateTenantSettings({
        distributionMode: mode,
        // Auto distribution always lets agents work the pool; the toggle only applies to manual.
        agentClaimEnabled: mode === "MANUAL" ? claim : true,
        createAssigneeEnabled: assignee,
      }),
    onMutate: () => {
      setError(null);
      setSaved(false);
    },
    onSuccess: () => {
      setSaved(true);
      setDraft({});
      void queryClient.invalidateQueries({ queryKey: KEYS.settings });
      void queryClient.invalidateQueries({ queryKey: ["cases", "policy"] });
    },
    onError: (cause: Error) => setError(cause.message),
  });

  return (
    <AdminFrame
      title={t("cases.admin.distribution.title")}
      description={t("cases.admin.distribution.description")}
      actions={<RefreshButton onClick={() => void settings.refetch()} busy={settings.isFetching} />}
    >
      {(error || settings.error) && <Banner tone="error">{error ?? settings.error?.message}</Banner>}
      {saved && <Banner tone="success">{t("cases.admin.saved")}</Banner>}
      {settings.isPending ? (
        <Loading />
      ) : (
        <AdminCard title={t("cases.admin.distribution.card")} hint={t("cases.admin.distribution.hint")}>
          <RadioGroup
            value={mode}
            onValueChange={(value) => setDraft((d) => ({ ...d, mode: value as DistributionMode }))}
            className="gap-3"
          >
            <div
              className={cn(
                "space-y-3 rounded-xl border p-4",
                mode === "MANUAL" ? "border-primary bg-primary-soft/30" : "border-border",
              )}
            >
              <Label className="flex items-start gap-3 font-normal">
                <RadioGroupItem value="MANUAL" className="mt-0.5" />
                <span>
                  <strong className="block text-sm">{t("cases.admin.distribution.manual")}</strong>
                  <span className="text-xs text-muted-foreground">
                    {t("cases.admin.distribution.manual-hint")}
                  </span>
                </span>
              </Label>
              <Label
                className={cn("ms-7 flex items-start gap-3 font-normal", mode !== "MANUAL" && "opacity-50")}
              >
                <Checkbox
                  checked={claim}
                  disabled={mode !== "MANUAL"}
                  onCheckedChange={(checked) => setDraft((d) => ({ ...d, claim: checked === true }))}
                  className="mt-0.5"
                />
                <span>
                  <strong className="block text-sm">{t("cases.admin.distribution.claim")}</strong>
                  <span className="text-xs text-muted-foreground">
                    {t("cases.admin.distribution.claim-hint")}
                  </span>
                </span>
              </Label>
            </div>
            <div
              className={cn(
                "rounded-xl border p-4",
                mode === "AUTO" ? "border-primary bg-primary-soft/30" : "border-border",
              )}
            >
              <Label className="flex items-start gap-3 font-normal">
                <RadioGroupItem value="AUTO" className="mt-0.5" />
                <span>
                  <strong className="block text-sm">{t("cases.admin.distribution.auto")}</strong>
                  <span className="text-xs text-muted-foreground">
                    {t("cases.admin.distribution.auto-hint")}
                  </span>
                </span>
              </Label>
            </div>
          </RadioGroup>
          <Label className="flex items-start gap-3 rounded-xl border border-border p-4 font-normal">
            <Checkbox
              checked={assignee}
              onCheckedChange={(checked) => setDraft((d) => ({ ...d, assignee: checked === true }))}
              className="mt-0.5"
            />
            <span>
              <strong className="block text-sm">{t("cases.admin.distribution.assignee")}</strong>
              <span className="text-xs text-muted-foreground">
                {t("cases.admin.distribution.assignee-hint")}
              </span>
            </span>
          </Label>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? t("cases.saving") : t("cases.admin.distribution.save")}
          </Button>
        </AdminCard>
      )}
    </AdminFrame>
  );
}
