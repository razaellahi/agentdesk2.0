import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getConfig } from "@/config";
import { ApiError } from "@/core/api";
import { getSession } from "@/core/auth";
import { confirm } from "@/components/common/confirm";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getArchival, saveArchival, type ArchivalSettings } from "./api";
function emptySetting(tenantId?: string): ArchivalSettings {
  return {
    id: 0,
    tenantId,
    isArchiveEnabled: false,
    externalServerIp: "",
    folderPath: tenantId ? `/root/vrs-archive/${tenantId}` : "",
    username: "",
    password: "",
    archiveMode: "archive_only",
    retentionDays: 30,
    copyTime: "00:00:00",
  };
}
export default function ArchivalPage() {
  const efcx = getConfig().DEPLOYMENT_PROFILE === "EFCX";
  const userTenant = getSession().user?.tenant;
  const [tenant, setTenant] = useState(
    (typeof userTenant === "string" ? userTenant : userTenant?.name) ||
      getConfig().DEFAULT_TENANT ||
      "expertflow",
  );
  const query = useQuery({
    queryKey: ["archival", efcx ? tenant : "singleton"],
    queryFn: async () => {
      try {
        return await getArchival(efcx ? tenant : undefined);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return emptySetting(efcx ? tenant : undefined);
        throw error;
      }
    },
  });
  if (query.isPending)
    return (
      <p role="status" className="p-6 text-sm text-muted-foreground">
        Loading archival settings…
      </p>
    );
  if (query.isError)
    return (
      <p role="alert" className="p-6 text-destructive-text">
        {query.error.message}
        <Button variant="ghost" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </p>
    );
  return (
    <ArchivalForm
      key={`${tenant}-${query.data?.id ?? 0}`}
      initial={query.data ?? emptySetting(efcx ? tenant : undefined)}
      efcx={efcx}
      onTenant={setTenant}
    />
  );
}
function ArchivalForm({
  initial,
  efcx,
  onTenant,
}: {
  initial: ArchivalSettings;
  efcx: boolean;
  onTenant: (tenant: string) => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [tenantDraft, setTenantDraft] = useState(initial.tenantId ?? "");
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useUnsavedChanges(dirty);
  const save = useMutation({
    mutationFn: saveArchival,
    onError: (error: Error) => toast.error(error.message),
    onSuccess: (result, submitted) => {
      const next =
        typeof result === "object" && result
          ? { ...submitted, ...(result as Partial<ArchivalSettings>) }
          : submitted;
      setSaved(next);
      setForm(next);
      client.setQueryData(["archival", efcx ? submitted.tenantId : "singleton"], next);
      toast.success("Archival settings saved");
    },
  });
  const set = (patch: Partial<ArchivalSettings>) => setForm((current) => ({ ...current, ...patch }));
  const load = async () => {
    const next = tenantDraft.trim();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(next)) {
      toast.error("Enter a valid Tenant ID.");
      return;
    }
    if (dirty && !(await confirm({ title: "Discard unsaved archival changes?", destructive: true }))) return;
    onTenant(next);
  };
  return (
    <form
      className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(form);
      }}
    >
      <div>
        <h2 className="text-lg font-semibold">Archival configuration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage recording retention and transfer to your SFTP server.
        </p>
      </div>
      {efcx && (
        <div className="flex items-end gap-2 rounded-xl border bg-surface p-4">
          <label htmlFor="archive-tenant" className="grid flex-1 gap-1 text-sm">
            Tenant ID
            <Input
              id="archive-tenant"
              value={tenantDraft}
              onChange={(event) => setTenantDraft(event.target.value)}
            />
          </label>
          <Button type="button" variant="outline" disabled={save.isPending} onClick={() => void load()}>
            Load tenant
          </Button>
        </div>
      )}
      {!form.id && (
        <p role="status" className="text-sm text-muted-foreground">
          No existing setting. Save to create{" "}
          {efcx ? `a configuration for ${form.tenantId}` : "the archival configuration"}.
        </p>
      )}
      <div className="rounded-xl border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <Label htmlFor="archive-enabled">{t("recordings.enabled")}</Label>
          <Switch
            id="archive-enabled"
            checked={form.isArchiveEnabled}
            disabled={save.isPending}
            onCheckedChange={(isArchiveEnabled) => set({ isArchiveEnabled })}
          />
        </div>
        <fieldset
          disabled={!form.isArchiveEnabled || save.isPending}
          className="mt-5 grid gap-4 disabled:opacity-60 sm:grid-cols-2"
        >
          <label className="grid gap-1 text-sm">
            {t("recordings.server")}
            <Input
              required
              value={form.externalServerIp}
              pattern="([0-9]{1,3}\.){3}[0-9]{1,3}"
              onChange={(event) => set({ externalServerIp: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("recordings.folder")}
            <Input
              required
              value={form.folderPath}
              pattern="/(?!.*//)([\w.-]+/)*[\w.-]+"
              onChange={(event) => set({ folderPath: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("recordings.username")}
            <Input
              required
              value={form.username}
              onChange={(event) => set({ username: event.target.value })}
              autoComplete="off"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("recordings.password")}
            <Input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(event) => set({ password: event.target.value })}
              autoComplete="new-password"
            />
          </label>
          <label htmlFor="archive-mode" className="grid gap-1 text-sm">
            {t("recordings.mode")}
            <select
              id="archive-mode"
              className="h-9 rounded-md border bg-surface px-2"
              value={form.archiveMode}
              onChange={(event) => set({ archiveMode: event.target.value })}
            >
              <option value="archive_only">Archive only</option>
              <option value="copy_and_archive">Copy and archive</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {t("recordings.retention")}
            <Input
              type="number"
              min={1}
              max={364}
              step={1}
              required
              value={form.retentionDays}
              onChange={(event) => set({ retentionDays: Number(event.target.value) })}
            />
          </label>
          {form.archiveMode === "copy_and_archive" && (
            <label htmlFor="archive-copy-time" className="grid gap-1 text-sm">
              Copy time
              <Input
                id="archive-copy-time"
                type="time"
                step={60}
                required
                value={form.copyTime?.slice(0, 5) ?? "00:00"}
                onChange={(event) => set({ copyTime: `${event.target.value}:00` })}
              />
            </label>
          )}
        </fieldset>
        <div className="mt-5 flex items-center justify-end gap-2">
          <span className="me-auto text-xs text-muted-foreground">
            {dirty ? "Unsaved changes" : "Saved values"}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || save.isPending}
            onClick={() => setForm(saved)}
          >
            Discard
          </Button>
          <Button type="submit" disabled={save.isPending || (!dirty && Boolean(form.id))}>
            {save.isPending ? "Saving…" : t("recordings.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
