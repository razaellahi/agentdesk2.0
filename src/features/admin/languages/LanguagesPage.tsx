import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Clock, Globe2, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { ReadOnlyNotice } from "@/components/common/ReadOnlyNotice";
import { SaveBar } from "@/components/common/SaveBar";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/core/api";
import { usePermission } from "@/core/auth";
import { languageMeta, reloadLocaleSetting, type LocaleSetting } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import { adminKeys, createLocaleSetting, getLocaleSetting, updateLocaleSetting } from "../api";
import { SettingsSection } from "../components/SettingsLayout";
import { LANGUAGE_OPTIONS, type LanguageOption } from "./languageOptions";

function timeZones(current?: string): string[] {
  let zones: string[];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = ["UTC"];
  }
  if (!zones.includes("UTC")) zones = ["UTC", ...zones];
  // Keep legacy names saved by the old admin (moment-timezone aliases).
  if (current && !zones.includes(current)) zones = [current, ...zones];
  return zones;
}

interface FormState {
  timezone: string;
  supported: string[];
  defaultCode: string;
}

function fromSetting(setting: LocaleSetting | null): FormState {
  if (!setting) return { timezone: "UTC", supported: ["en"], defaultCode: "en" };
  const supported = setting.supportedLanguages
    .map((l) => l.code)
    .filter((c) => LANGUAGE_OPTIONS.some((o) => o.code === c));
  return {
    timezone: setting.timezone?.name || "UTC",
    supported: supported.length ? supported : ["en"],
    defaultCode: setting.defaultLanguage?.code || supported[0] || "en",
  };
}

const sameForm = (a: FormState, b: FormState) =>
  a.timezone === b.timezone &&
  a.defaultCode === b.defaultCode &&
  [...a.supported].sort().join() === [...b.supported].sort().join();

/** Languages & timezone for the tenant (unified-admin /agent-desk/languages). */
export default function LanguagesPage() {
  const { t } = useTranslation();
  const canManage = usePermission("adminSettingsManage");
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: adminKeys.locale, queryFn: getLocaleSetting });
  const saved = useMemo(() => fromSetting(query.data ?? null), [query.data]);
  // Edits live in a draft; with no draft the page shows the saved values.
  const [draft, setDraft] = useState<FormState | null>(null);
  const form = draft ?? saved;
  const setForm = (update: (f: FormState) => FormState) => setDraft((d) => update(d ?? saved));
  const [tzOpen, setTzOpen] = useState(false);

  const dirty = !sameForm(form, saved);
  useUnsavedChanges(dirty && canManage, t("admin-languages.unsaved"));
  const zones = useMemo(() => timeZones(query.data?.timezone?.name), [query.data]);

  const save = useMutation({
    mutationFn: async () => {
      const pick = (code: string): LanguageOption => LANGUAGE_OPTIONS.find((o) => o.code === code)!;
      // Order supported languages as in the catalogue, like the old multi-select.
      const supportedLanguages = LANGUAGE_OPTIONS.filter((o) => form.supported.includes(o.code));
      const body = {
        timezone: { id: zones.indexOf(form.timezone) + 1, name: form.timezone },
        supportedLanguages,
        defaultLanguage: pick(form.defaultCode),
      };
      const existing = query.data;
      return existing?.id ? updateLocaleSetting({ ...body, id: existing.id }) : createLocaleSetting(body);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.locale });
      if (result && typeof result === "object") queryClient.setQueryData(adminKeys.locale, result);
      setDraft(null);
      await reloadLocaleSetting();
      toast.success(t("admin-languages.saved"));
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t("admin-settings.save-failed")),
  });

  const toggleLanguage = (code: string) => {
    setForm((f) => {
      if (f.supported.includes(code)) {
        if (f.supported.length === 1) return f; // at least one language must remain
        const ordered = LANGUAGE_OPTIONS.map((o) => o.code).filter((c) => f.supported.includes(c));
        const supported = f.supported.filter((c) => c !== code);
        let defaultCode = f.defaultCode;
        if (defaultCode === code) {
          // Default moves to the next selected language (or the previous one), as before.
          const i = ordered.indexOf(code);
          defaultCode = ordered[i + 1] ?? ordered[i - 1] ?? supported[0]!;
        }
        return { ...f, supported, defaultCode };
      }
      return { ...f, supported: [...f.supported, code] };
    });
  };

  if (query.isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const ro = !canManage;
  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
      <PageHeader description={t("admin-languages.description")} className="mb-4" />
      {ro && <ReadOnlyNotice />}
      <div className="mt-4 flex flex-col gap-5">
        <SettingsSection
          id="timezone"
          icon={Clock}
          title={t("admin-languages.timezone")}
          description={t("admin-languages.timezone-hint")}
        >
          <div className="px-5 py-4">
            <Popover open={tzOpen} onOpenChange={setTzOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={tzOpen}
                  className="w-full justify-between sm:w-96"
                  disabled={ro}
                >
                  <span className="truncate">{form.timezone}</span>
                  <ChevronsUpDown className="size-4 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("admin-languages.search-timezone")} />
                  <CommandList>
                    <CommandEmpty>{t("globals.no-data-available")}</CommandEmpty>
                    <CommandGroup>
                      {zones.map((zone) => (
                        <CommandItem
                          key={zone}
                          value={zone}
                          onSelect={() => {
                            setForm((f) => ({ ...f, timezone: zone }));
                            setTzOpen(false);
                          }}
                        >
                          <Check
                            className={cn("size-4", zone === form.timezone ? "opacity-100" : "opacity-0")}
                          />
                          {zone}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </SettingsSection>

        <SettingsSection
          id="languages"
          icon={Globe2}
          title={t("admin-languages.supported")}
          description={t("admin-languages.supported-hint")}
        >
          <RadioGroup
            value={form.defaultCode}
            onValueChange={(code) => setForm((f) => ({ ...f, defaultCode: code }))}
            className="grid gap-2 p-5 sm:grid-cols-2"
            disabled={ro}
            aria-label={t("admin-languages.default")}
          >
            {LANGUAGE_OPTIONS.map((lang) => {
              const on = form.supported.includes(lang.code);
              const isDefault = form.defaultCode === lang.code;
              const meta = languageMeta(lang.code);
              return (
                <div
                  key={lang.code}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    on ? "border-border-primary bg-primary-soft/50" : "bg-surface",
                  )}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    disabled={ro || (on && form.supported.length === 1)}
                    onClick={() => toggleLanguage(lang.code)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-start disabled:cursor-not-allowed"
                  >
                    <span
                      className={cn(
                        "grid size-4.5 shrink-0 place-items-center rounded border",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border-strong",
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    <img
                      src={lang.flag}
                      alt=""
                      className="h-4 w-6 shrink-0 rounded-[2px] object-cover shadow-sm"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{lang.name}</span>
                      <span className="block truncate text-xs text-muted-foreground" dir={meta.dir}>
                        {meta.nativeName} · {lang.code}
                      </span>
                    </span>
                  </button>
                  {on && (
                    <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-medium">
                      <RadioGroupItem
                        value={lang.code}
                        aria-label={t("admin-languages.make-default", { name: lang.name })}
                      />
                      {isDefault ? (
                        <span className="inline-flex items-center gap-1 font-medium text-primary">
                          <Star className="size-3 fill-current" /> {t("admin-languages.default")}
                        </span>
                      ) : (
                        t("admin-languages.default")
                      )}
                    </label>
                  )}
                </div>
              );
            })}
          </RadioGroup>
        </SettingsSection>

        {canManage && (
          <SaveBar
            visible={dirty}
            saving={save.isPending}
            onDiscard={() => setDraft(null)}
            onSave={() => save.mutate()}
          />
        )}
      </div>
    </div>
  );
}
