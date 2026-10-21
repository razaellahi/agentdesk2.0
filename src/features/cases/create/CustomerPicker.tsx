import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { initials } from "@/shared/lib/initials";
import { fetchCustomerOpenCaseCount, listCimLabels, searchCimCustomers } from "../api";
import { toSelectedCustomer, type SelectedCustomer } from "../model/customer";

/** CIM customer search with labels, SLA tier and open-case warning (case-customer-picker). */
export function CustomerPicker({
  value,
  onChange,
  slaTierNames,
}: {
  value: SelectedCustomer | null;
  onChange: (customer: SelectedCustomer | null) => void;
  slaTierNames: string[];
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  const labels = useQuery({
    queryKey: ["cases", "cim-labels"],
    queryFn: listCimLabels,
    staleTime: 5 * 60_000,
  });
  const results = useQuery({
    queryKey: ["cases", "cim-search", debounced],
    queryFn: () => searchCimCustomers(debounced, 10, 0),
    enabled: debounced.length >= 2,
  });
  const catalog = labels.data ?? [];
  const rows = (results.data?.docs ?? []).map((doc) => toSelectedCustomer(doc, catalog, slaTierNames, 0));

  const pick = async (customer: SelectedCustomer) => {
    setPicking(true);
    const openCases = await fetchCustomerOpenCaseCount(customer.profileId).catch(() => 0);
    setPicking(false);
    onChange({ ...customer, openCases });
    setQuery("");
    setOpen(false);
  };

  if (value) {
    return (
      <div className="space-y-3 rounded-xl border border-border p-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {initials(
              value.displayName.split(/\s+/)[0],
              value.displayName.split(/\s+/)[1],
              value.displayName,
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{value.displayName}</p>
            <div className="flex flex-wrap gap-1">
              {value.labelNames.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-surface-2"
            aria-label={t("cases.create.clear-customer")}
            onClick={() => onChange(null)}
          >
            <X className="size-4" />
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">{t("cases.create.email")}</dt>
            <dd>{value.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("cases.create.phone")}</dt>
            <dd>{value.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("cases.create.labels")}</dt>
            <dd>{value.labelNames.join(", ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("cases.create.open-cases")}</dt>
            <dd>{value.openCases}</dd>
          </div>
        </dl>
        {value.openCases > 0 && (
          <p className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning-text">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {t("cases.create.duplicate-warning", { count: value.openCases })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute start-3 top-2.5 size-4 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t("cases.create.customer-search")}
        aria-label={t("cases.create.customer-search")}
        autoComplete="off"
        className="ps-9"
        disabled={picking}
      />
      {results.isError && (
        <p className="mt-1 text-xs text-destructive-text">{t("cases.create.customer-search-failed")}</p>
      )}
      {open && query.trim().length < 2 && (
        <p className="mt-1 text-xs text-muted-foreground">{t("cases.create.customer-min-chars")}</p>
      )}
      {open && query.trim().length >= 2 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {results.isFetching || debounced !== query.trim() ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">{t("cases.create.searching")}</li>
          ) : rows.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">
              {t("cases.create.no-customers", { query: query.trim() })}
            </li>
          ) : (
            rows.map((c) => (
              <li key={c.profileId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-start hover:bg-surface-2"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    void pick(c);
                  }}
                >
                  <span className="text-sm font-medium">{c.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.email || "—"} · {c.phone || "—"}
                    {c.labelNames[0] ? ` · ${c.labelNames[0]}` : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
