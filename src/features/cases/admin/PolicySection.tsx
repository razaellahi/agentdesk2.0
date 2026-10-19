import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SaveBar } from "@/components/common/SaveBar";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/core/i18n";
import { fetchTenantSettings, updateTenantSettings, type TenantSettings } from "../api";
import {
  POLICY_FIELDS as FIELDS,
  POLICY_LIMITS,
  policyFieldValid,
  type PolicyField as Field,
} from "../model/policy";
import { AdminCard, AdminFrame, Banner } from "./AdminFrame";

/** Reopen window, audit retention, recent-cases lookback and dashboard refresh (admin-settings). */
export function PolicySection({ onOpenDistribution }: { onOpenDistribution: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["cases", "admin", "tenant-settings"],
    queryFn: fetchTenantSettings,
  });
  const [draft, setDraft] = useState<Partial<Record<Field, number>>>({});
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = (field: Field) => draft[field] ?? settings.data?.[field] ?? 0;
  const dirty = Object.keys(draft).length > 0;

  const save = useMutation({
    mutationFn: () =>
      updateTenantSettings(Object.fromEntries(FIELDS.map((f) => [f, value(f)])) as Partial<TenantSettings>),
    onMutate: () => {
      setError(null);
      setSuccess(false);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(["cases", "admin", "tenant-settings"], saved);
      void queryClient.invalidateQueries({ queryKey: ["cases", "policy"] });
      setDraft({});
      setSuccess(true);
    },
    onError: (cause: Error) => setError(cause.message),
  });

  const submit = () => {
    const next: Partial<Record<Field, string>> = {};
    for (const field of FIELDS) {
      if (!policyFieldValid(field, value(field))) {
        const { min, max, unit } = POLICY_LIMITS[field];
        next[field] = t("cases.admin.policy.range", { min, max, unit: t(`cases.admin.policy.unit-${unit}`) });
      }
    }
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate();
  };

  return (
    <AdminFrame title={t("cases.admin.policy.title")} description={t("cases.admin.policy.description")}>
      {(error || settings.error) && <Banner tone="error">{error ?? settings.error?.message}</Banner>}
      {success && <Banner tone="success">{t("cases.admin.policy.saved")}</Banner>}
      <Banner tone="info">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          {t("cases.admin.policy.distribution-elsewhere")}{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={onOpenDistribution}
          >
            {t("cases.admin.distribution.title")}
          </button>
        </p>
      </Banner>
      {settings.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("cases.loading")}
        </p>
      ) : (
        <AdminCard title={t("cases.admin.policy.card")}>
          <form
            className="divide-y divide-border"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            {FIELDS.map((field) => {
              const { min, max, unit } = POLICY_LIMITS[field];
              const id = `policy-${field}`;
              return (
                <div key={field} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <label htmlFor={id} className="text-sm font-medium">
                      {t(`cases.admin.policy.${field}`)}
                    </label>
                    <p className="text-xs text-muted-foreground">{t(`cases.admin.policy.${field}-help`)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        id={id}
                        type="number"
                        min={min}
                        max={max}
                        className="w-28"
                        value={value(field)}
                        aria-invalid={Boolean(errors[field]) || undefined}
                        onChange={(event) => {
                          setDraft((d) => ({ ...d, [field]: Number(event.target.value) }));
                          setErrors(({ [field]: _cleared, ...rest }) => rest);
                          setSuccess(false);
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {t(`cases.admin.policy.unit-${unit}`)}
                      </span>
                    </div>
                    {errors[field] && <p className="text-xs text-destructive-text">{errors[field]}</p>}
                  </div>
                </div>
              );
            })}
          </form>
          {settings.data?.updatedAt && (
            <p className="text-xs text-muted-foreground">
              {t("cases.admin.policy.updated", { at: formatDateTime(settings.data.updatedAt) })}
            </p>
          )}
        </AdminCard>
      )}
      <SaveBar
        visible={dirty}
        saving={save.isPending}
        message={t("cases.admin.policy.unsaved")}
        onDiscard={() => {
          setDraft({});
          setErrors({});
        }}
        onSave={submit}
      />
    </AdminFrame>
  );
}
