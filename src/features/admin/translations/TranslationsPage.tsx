import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Download,
  Eye,
  FileJson,
  FileSpreadsheet,
  History,
  Loader2,
  MoreHorizontal,
  Search,
  Sheet,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm";
import { ReadOnlyNotice } from "@/components/common/ReadOnlyNotice";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/core/api";
import { usePermission } from "@/core/auth";
import { languageMeta, reloadLanguage } from "@/core/i18n";
import { localStore } from "@/core/storage/storage";
import {
  adminKeys,
  getAllTranslations,
  getBackupTranslations,
  getLocaleSetting,
  getReferenceTranslations,
  restoreBackupTranslation,
  saveTranslations,
} from "../api";
import { exportCsv, exportExcel, exportJson, ImportError, parseImport } from "./io";
import { TranslationGrid, type GridColumn } from "./TranslationGrid";
import {
  countChanged,
  extractReferenceTemplate,
  flatEqual,
  flatten,
  invalidValuePath,
  REFERENCE_LOCALE,
  unflatten,
  validateAgainstReference,
  validateCompare,
  type Flat,
  type Tree,
  type ValidationDetails,
} from "./tools";
import { ValidationNotice } from "./ValidationNotice";

type Mode = "edit" | "compare" | "default";

/** Agent Desk translations editor (unified-admin /agent-desk/translations, file-engine i18n). */
export default function TranslationsPage() {
  const { t } = useTranslation();
  const canManage = usePermission("adminSettingsManage");
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const translationsQuery = useQuery({ queryKey: adminKeys.translations, queryFn: getAllTranslations });
  const referenceQuery = useQuery({ queryKey: adminKeys.reference, queryFn: getReferenceTranslations });
  const backupsQuery = useQuery({ queryKey: adminKeys.backups, queryFn: getBackupTranslations });
  const localeQuery = useQuery({ queryKey: adminKeys.locale, queryFn: getLocaleSetting });

  const reference = useMemo(() => {
    const template = referenceQuery.data ? extractReferenceTemplate(referenceQuery.data) : null;
    return template && !invalidValuePath(template) ? template : null;
  }, [referenceQuery.data]);
  const referenceFlat = useMemo(() => (reference ? flatten(reference) : {}), [reference]);
  const backups = useMemo(() => backupsQuery.data ?? {}, [backupsQuery.data]);

  // Server copy per locale; `edits` holds working copies of locales the admin changed or imported.
  const serverFlats = useMemo<Record<string, Flat>>(
    () =>
      Object.fromEntries(
        Object.entries(translationsQuery.data ?? {}).map(([k, v]) => [k, flatten(v as Tree)]),
      ),
    [translationsQuery.data],
  );
  const [edits, setEdits] = useState<Record<string, Flat>>({});
  const work = useMemo(() => ({ ...serverFlats, ...edits }), [serverFlats, edits]);
  const saved = serverFlats;

  const [chosen, setChosen] = useState("");
  const [mode, setMode] = useState<Mode>("edit");
  const [compareLeft, setCompareLeft] = useState("");
  const [defaultLocale, setDefaultLocale] = useState("");
  const [search, setSearch] = useState("");
  const [showKeys, setShowKeys] = useState(() => localStore.getString("translations.showKeys") === "1");
  const [keyWidth, setKeyWidth] = useState(25);
  const [importIssue, setImportIssue] = useState<ValidationDetails | null>(null);
  const [dismissedSig, setDismissedSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const name = useCallback(
    (code: string) =>
      code === REFERENCE_LOCALE
        ? t("admin-translations.default-translation")
        : languageMeta(code).englishName,
    [t],
  );

  const locales = useMemo(() => Object.keys(work), [work]);
  const backupLocales = useMemo(() => Object.keys(backups), [backups]);
  // Selected language: the admin's choice, else the tenant default, else the first one.
  const selected = useMemo(() => {
    if (chosen && work[chosen]) return chosen;
    const preferred = localeQuery.data?.defaultLanguage?.code;
    return preferred && work[preferred] ? preferred : (locales[0] ?? "");
  }, [chosen, work, localeQuery.data, locales]);
  const setSelected = (locale: string) => {
    setChosen(locale);
    setImportIssue(null);
  };

  const dirtyLocales = useMemo(
    () => locales.filter((l) => !saved[l] || !flatEqual(work[l] ?? {}, saved[l] ?? {})),
    [locales, work, saved],
  );
  const editDirty = mode === "edit" ? dirtyLocales.includes(selected) : false;
  const compareDirty =
    mode === "compare" &&
    (dirtyLocales.includes(selected) ||
      (compareLeft !== REFERENCE_LOCALE && dirtyLocales.includes(compareLeft)));
  const dirty = editDirty || compareDirty;
  const changedCount =
    mode === "compare"
      ? countChanged(work[selected] ?? {}, saved[selected] ?? {}) +
        (compareLeft !== REFERENCE_LOCALE
          ? countChanged(work[compareLeft] ?? {}, saved[compareLeft] ?? {})
          : 0)
      : countChanged(work[selected] ?? {}, saved[selected] ?? {});
  useUnsavedChanges(dirty && canManage, t("admin-translations.unsaved-leave"));

  // Live structure validation (updateStructureValidation / updateCompareValidation).
  const liveValidation = useMemo(() => {
    if (!selected) return null;
    if (mode === "compare") {
      const left = compareLeft === REFERENCE_LOCALE ? referenceFlat : (work[compareLeft] ?? {});
      return validateCompare(left, work[selected] ?? {}, { left: name(compareLeft), right: name(selected) });
    }
    if (mode === "edit" && reference) {
      return validateAgainstReference(reference, unflatten(work[selected] ?? {}), {
        left: name(REFERENCE_LOCALE),
        right: name(selected),
      });
    }
    return null;
  }, [mode, selected, compareLeft, work, reference, referenceFlat, name]);
  const validation = importIssue ?? liveValidation;
  const validationSig = validation
    ? `${validation.kind}:${validation.reason}:${validation.missingKeys.length}:${validation.extraKeys.length}`
    : null;
  const dismissed = validationSig !== null && dismissedSig === validationSig;
  const showValidation = () => setDismissedSig(null);

  const discard = useCallback(() => {
    setEdits((e) => {
      const next = { ...e };
      for (const l of [selected, compareLeft]) if (l) delete next[l];
      return next;
    });
    setImportIssue(null);
  }, [compareLeft, selected]);

  const guard = async (message: string) => {
    if (!dirty) return true;
    const ok = await confirm({
      title: t("common.unsaved-title"),
      description: message,
      confirmLabel: t("common.discard-changes"),
      destructive: true,
    });
    if (ok) discard();
    return ok;
  };

  const changeLocale = async (next: string) => {
    if (next === selected) return;
    if (await guard(t("admin-translations.unsaved-switch"))) {
      setSelected(next);
      setSearch("");
    }
  };

  const compareReferenceFor = (edit: string) => {
    if (locales.includes("en") && edit !== "en") return "en";
    const other = locales.find((l) => l !== edit);
    if (other) return other;
    return reference ? REFERENCE_LOCALE : "";
  };

  const openCompare = async () => {
    if (!(await guard(t("admin-translations.unsaved-compare")))) return;
    setCompareLeft(compareReferenceFor(selected));
    setMode("compare");
  };

  const closeCompare = async () => {
    if (!(await guard(t("admin-translations.unsaved-close-compare")))) return;
    setMode("edit");
  };

  const openDefault = async () => {
    if (!backupLocales.length) return toast.error(t("admin-translations.no-backups"));
    if (!(await guard(t("admin-translations.unsaved-default")))) return;
    setDefaultLocale(backupLocales.includes(selected) ? selected : backupLocales[0]!);
    setShowKeys(true);
    setSearch("");
    setMode("default");
  };

  const setValue = useCallback(
    (locale: string) => (key: string, value: string) => {
      setEdits((e) => ({ ...e, [locale]: { ...(e[locale] ?? serverFlats[locale] ?? {}), [key]: value } }));
    },
    [serverFlats],
  );

  const persist = async (localesToSave: string[]) => {
    setBusy(true);
    try {
      await Promise.all(localesToSave.map((l) => saveTranslations(l, unflatten(work[l] ?? {}))));
      // The saved copies become the new server state; their working copies are dropped.
      queryClient.setQueryData(adminKeys.translations, (old: Record<string, Tree> | undefined) => ({
        ...(old ?? {}),
        ...Object.fromEntries(localesToSave.map((l) => [l, unflatten(work[l] ?? {})])),
      }));
      setEdits((e) => Object.fromEntries(Object.entries(e).filter(([l]) => !localesToSave.includes(l))));
      await Promise.all(localesToSave.map((l) => reloadLanguage(l)));
      void queryClient.invalidateQueries({ queryKey: adminKeys.backups });
      toast.success(t("admin-translations.saved", { names: localesToSave.map(name).join(" & ") }));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("admin-translations.save-failed"));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (mode === "compare") {
      if (validation) {
        showValidation();
        return toast.error(t("admin-translations.validation.keys-mismatch"));
      }
      const targets = [selected, compareLeft].filter(
        (l) => l && l !== REFERENCE_LOCALE && dirtyLocales.includes(l),
      );
      if (!targets.length) return toast.error(t("admin-translations.nothing-to-save"));
      return persist(targets);
    }
    const result = validateAgainstReference(reference, unflatten(work[selected] ?? {}), {
      left: name(REFERENCE_LOCALE),
      right: name(selected),
    });
    if (result) {
      showValidation();
      return toast.error(
        t("admin-translations.cannot-save", { reason: t(`admin-translations.validation.${result.reason}`) }),
      );
    }
    return persist([selected]);
  };

  const restore = async () => {
    const locale = selected;
    if (!backupLocales.includes(locale))
      return toast.error(t("admin-translations.no-backup-for", { name: name(locale) }));
    const ok = await confirm({
      title: t("admin-translations.restore-title"),
      description: dirty
        ? t("admin-translations.restore-confirm-dirty", { name: name(locale) })
        : t("admin-translations.restore-confirm", { name: name(locale) }),
      confirmLabel: t("admin-translations.restore"),
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await restoreBackupTranslation(locale);
      setEdits((e) => Object.fromEntries(Object.entries(e).filter(([l]) => l !== locale)));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.translations }),
        queryClient.invalidateQueries({ queryKey: adminKeys.backups }),
      ]);
      await reloadLanguage(locale);
      toast.success(t("admin-translations.restored", { name: name(locale) }));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("admin-translations.restore-failed"));
    } finally {
      setBusy(false);
    }
  };

  const onImport = async (file: File) => {
    if (!reference) return toast.error(t("admin-translations.reference-required"));
    try {
      const { flat, locale } = await parseImport(file);
      const target = locale || selected;
      const result = validateAgainstReference(reference, unflatten(flat), {
        left: name(REFERENCE_LOCALE),
        right: name(target),
      });
      if (result) {
        setImportIssue(result);
        showValidation();
        return;
      }
      const isNew = !locales.includes(target);
      setEdits((e) => ({ ...e, [target]: flat }));
      setSelected(target);
      setMode("edit");
      toast.success(
        t(isNew ? "admin-translations.imported-new" : "admin-translations.imported", {
          locale: target,
          count: Object.keys(flat).length,
        }),
      );
    } catch (error) {
      toast.error(error instanceof ImportError ? error.reason : t("admin-translations.import-failed"));
    }
  };

  const exportAs = async (format: "json" | "csv" | "xlsx") => {
    const isDefault = mode === "default";
    const locale = isDefault ? defaultLocale : selected;
    const flat = isDefault ? flatten((backups[defaultLocale] as Tree) ?? {}) : (work[selected] ?? {});
    const base = isDefault ? `${locale}-default` : locale;
    if (format === "json")
      exportJson(isDefault ? ((backups[defaultLocale] as Tree) ?? {}) : unflatten(flat), `${base}.json`);
    else if (format === "csv") await exportCsv(flat, `${base}.csv`);
    else await exportExcel(flat, `${base}.xlsx`, isDefault ? "Reference" : "Translations");
  };

  // ---- grid model
  const { keys, columns } = useMemo(() => {
    let cols: GridColumn[];
    if (mode === "default") {
      const flat = flatten((backups[defaultLocale] as Tree) ?? {});
      cols = [
        {
          id: "default",
          label: t("admin-translations.default-of", { name: name(defaultLocale) }),
          values: flat,
          editable: false,
        },
      ];
    } else if (mode === "compare") {
      const leftValues = compareLeft === REFERENCE_LOCALE ? referenceFlat : (work[compareLeft] ?? {});
      cols = [
        {
          id: "left",
          label: name(compareLeft),
          values: leftValues,
          saved: compareLeft === REFERENCE_LOCALE ? undefined : saved[compareLeft],
          editable: canManage && compareLeft !== REFERENCE_LOCALE,
          onChange: setValue(compareLeft),
        },
        {
          id: "right",
          label: name(selected),
          values: work[selected] ?? {},
          saved: saved[selected],
          editable: canManage,
          onChange: setValue(selected),
        },
      ];
    } else {
      cols = [
        {
          id: "value",
          label: name(selected),
          values: work[selected] ?? {},
          saved: saved[selected],
          editable: canManage,
          onChange: setValue(selected),
        },
      ];
    }
    const allKeys = Array.from(new Set(cols.flatMap((c) => Object.keys(c.values))));
    if (mode === "compare") allKeys.sort((a, b) => a.localeCompare(b));
    const term = search.trim().toLowerCase();
    const filtered = term
      ? allKeys.filter(
          (k) =>
            k.toLowerCase().includes(term) ||
            cols.some((c) => (c.values[k] ?? "").toLowerCase().includes(term)),
        )
      : allKeys;
    return { keys: filtered, columns: cols };
  }, [
    mode,
    backups,
    defaultLocale,
    compareLeft,
    referenceFlat,
    work,
    saved,
    selected,
    canManage,
    search,
    name,
    setValue,
    t,
  ]);

  const loading = translationsQuery.isLoading || referenceQuery.isLoading;
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4 sm:p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[60vh] w-full rounded-xl" />
      </div>
    );
  }

  const compareOptions = [
    ...(reference && !locales.includes("en") ? [REFERENCE_LOCALE] : []),
    ...locales,
  ].filter((l) => l !== selected);

  return (
    <div className="flex h-full min-h-[560px] flex-col gap-3 p-4 sm:p-6">
      {!canManage && <ReadOnlyNotice />}
      {referenceQuery.isError && (
        <p className="text-sm text-destructive-text">{t("admin-translations.reference-failed")}</p>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {mode === "default" ? (
          <>
            <Badge variant="secondary" className="gap-1">
              <History className="size-3" /> {t("admin-translations.default-translation")}
            </Badge>
            <Select value={defaultLocale} onValueChange={setDefaultLocale}>
              <SelectTrigger className="w-44" aria-label={t("admin-translations.language")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {backupLocales.map((l) => (
                  <SelectItem key={l} value={l}>
                    {name(l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          <>
            {mode === "compare" && (
              <>
                <Select
                  value={compareLeft}
                  onValueChange={async (l) =>
                    (await guard(t("admin-translations.unsaved-switch"))) && setCompareLeft(l)
                  }
                >
                  <SelectTrigger className="w-44" aria-label={t("admin-translations.compare-with")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {compareOptions.map((l) => (
                      <SelectItem key={l} value={l}>
                        {name(l)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
              </>
            )}
            <Select value={selected} onValueChange={(l) => void changeLocale(l)}>
              <SelectTrigger className="w-44" aria-label={t("admin-translations.language")}>
                <SelectValue placeholder={t("admin-translations.language")} />
              </SelectTrigger>
              <SelectContent>
                {locales
                  .filter((l) => mode !== "compare" || l !== compareLeft)
                  .map((l) => (
                    <SelectItem key={l} value={l}>
                      {name(l)} {dirtyLocales.includes(l) && "•"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </>
        )}

        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search
            className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin-translations.search")}
            className="ps-8"
            aria-label={t("admin-translations.search")}
          />
        </div>
        <span className="text-sm text-muted-foreground tabular">
          {t("admin-translations.rows", { count: keys.length })}
        </span>

        <label className="ms-auto flex items-center gap-2 text-sm whitespace-nowrap">
          <Switch
            checked={showKeys}
            onCheckedChange={(v) => {
              setShowKeys(v);
              localStore.setString("translations.showKeys", v ? "1" : "0");
            }}
          />
          {t("admin-translations.show-keys")}
        </label>

        {mode === "edit" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openCompare()}
            disabled={!selected || !compareReferenceFor(selected)}
          >
            <ArrowLeftRight className="size-4" /> {t("admin-translations.compare")}
          </Button>
        )}
        {mode === "compare" && (
          <Button variant="outline" size="sm" onClick={() => void closeCompare()}>
            <X className="size-4" /> {t("admin-translations.close-compare")}
          </Button>
        )}
        {mode !== "default" ? (
          <Button variant="outline" size="sm" onClick={() => void openDefault()}>
            <Eye className="size-4" /> {t("admin-translations.view-default")}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setMode("edit")}>
            <X className="size-4" /> {t("admin-translations.close-default")}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label={t("admin-translations.more")}>
              <MoreHorizontal className="size-4" /> {t("admin-translations.more")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Download className="size-3.5" /> {t("admin-translations.export")}
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => void exportAs("json")}>
              <FileJson className="size-4" /> JSON
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exportAs("csv")}>
              <Sheet className="size-4" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exportAs("xlsx")}>
              <FileSpreadsheet className="size-4" /> Excel
            </DropdownMenuItem>
            {canManage && mode !== "default" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
                  <Upload className="size-4" /> {t("admin-translations.import")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={busy || !backupLocales.includes(selected)}
                  onSelect={() => void restore()}
                >
                  <History className="size-4" /> {t("admin-translations.restore")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={fileInput}
          type="file"
          accept=".json,.csv,.xlsx,.xls"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void onImport(file);
          }}
        />
      </div>

      {validation && !dismissed && mode !== "default" && (
        <ValidationNotice details={validation} onDismiss={() => setDismissedSig(validationSig)} />
      )}

      <TranslationGrid
        keys={keys}
        columns={columns}
        showKeys={showKeys}
        keyWidth={keyWidth}
        onKeyWidthChange={setKeyWidth}
      />

      {canManage && dirty && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-3">
          <Badge className="bg-warning text-on-warning">
            {t("admin-translations.unsaved-count", { count: changedCount })}
          </Badge>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () =>
                (await confirm({
                  title: t("common.unsaved-title"),
                  description: t("admin-translations.discard-confirm"),
                  destructive: true,
                  confirmLabel: t("common.discard-changes"),
                })) && discard()
              }
              disabled={busy}
            >
              {t("common.discard")}
            </Button>
            <Button onClick={() => void save()} disabled={busy || Boolean(validation)}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
