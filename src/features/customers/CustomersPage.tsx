import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  Columns3,
  Filter,
  Link2,
  Pencil,
  Plus,
  SearchX,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, DataView, EmptyRow, Td, Th } from "@/components/common/DataView";
import { EmptyState, Pager } from "@/components/common/ListChrome";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser, usePermission } from "@/core/auth";
import { maskPii } from "@/features/workspace";
import type { SchemaAttribute } from "@/features/workspace";
import { openLinkConversationDialog } from "@/features/workspace";
import { WORKSPACE_PATH } from "@/features/workspace";
import { linkCustomerWithTopic } from "@/features/workspace";
import { startConversationFromCustomer } from "@/features/workspace";
import type { Conversation } from "@/features/workspace";
import { useConversationStore, getConversation } from "@/features/workspace";
import { CustomerForm } from "./CustomerForm";
import { LabelDots } from "./LabelDots";
import { getCustomer, hydrateLabels, listLabels, type CustomerRow } from "./api";
import { AdvancedFilterDialog } from "./phonebook/AdvancedFilterDialog";
import { ColumnPreferencesDialog } from "./phonebook/ColumnPreferencesDialog";
import { ALL_FIELDS, CustomerSearchBar } from "./phonebook/CustomerSearchBar";
import {
  formatCellValue,
  getCustomersByFilterQuery,
  listPhonebookCustomers,
  searchCustomers,
} from "./phonebook/customersQuery";
import { OutboundRowActions } from "./phonebook/OutboundRowActions";
import { getUserPreference, resolveColumns } from "./phonebook/preferencesApi";
import { SavedFiltersMenu } from "./phonebook/SavedFiltersMenu";
import type { CustomerDoc, PhonebookColumn, SavedFilter, SchemaAttr } from "./phonebook/types";
import { cimCustomerApi } from "@/core/api";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { unwrapList } from "@/shared/lib/unwrap";
import { useSchemaStore } from "@/features/workspace";
import { isFakeConversation } from "@/features/workspace";

const PAGE_SIZES = [25, 50];
/** How long the agent stops typing before the search runs (unified-agent waits the same). */
const SEARCH_DELAY_MS = 800;

export default function CustomersPage() {
  const [params] = useSearchParams();
  return <CustomerDirectory key={params.toString()} />;
}

function CustomerDirectory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [params] = useSearchParams();
  const linking = params.get("q") === "linking";
  const conversationId = params.get("conversationId") ?? "";
  const topicCustomerId = params.get("topicCustomerId") ?? "";

  const canManage = usePermission("customerManage");
  const canManageInConversation = usePermission("customerManageInConversation");
  const canLabels = usePermission("customerLabels");
  const canMaskedPii = usePermission("maskedPii");
  const canInitiateChat = usePermission("initiateChat");
  const canLink = canManageInConversation || canManage;

  const [draft, setDraft] = useState(params.get("filterValue") ?? "");
  const [settled, searchNow] = useDebouncedValue(draft, SEARCH_DELAY_MS);
  const search = settled.trim();
  const [selectedSearchField, setSearchField] = useState(params.get("filterKey") ?? ALL_FIELDS);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]!);
  const [sortField, setSortField] = useState("firstName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [appliedFilter, setAppliedFilter] = useState<SavedFilter | null>(null);
  const [editing, setEditing] = useState<CustomerRow | null | "new">(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterEditing, setFilterEditing] = useState<SavedFilter | null>(null);
  // A new search, sort, filter or page size starts again from the first page.
  const pageKey = [
    search,
    selectedSearchField,
    sortField,
    sortOrder,
    labelIds.join(),
    appliedFilter?._id,
    pageSize,
  ].join("|");
  const [paged, setPaged] = useState({ key: pageKey, page: 0 });
  const page = paged.key === pageKey ? paged.page : 0;
  const setPage = (next: number) => setPaged({ key: pageKey, page: next });
  const clearSearch = () => {
    setDraft("");
    searchNow("");
  };

  const schemaQuery = useQuery({
    queryKey: ["customer-schema"],
    queryFn: async () => unwrapList<SchemaAttr>(await cimCustomerApi.get("/customerSchema")),
  });
  const labelsQuery = useQuery({ queryKey: ["labels"], queryFn: listLabels, enabled: canLabels });
  const prefQuery = useQuery({
    queryKey: ["phonebook-preference", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => getUserPreference(user!.id),
  });

  const linkingConversation = conversationId ? getConversation(conversationId) : undefined;
  const linkingAvailable =
    linking &&
    Boolean(conversationId) &&
    Boolean(linkingConversation) &&
    !isFakeConversation(linkingConversation!);

  const columns = useMemo(() => {
    const base = resolveColumns(schemaQuery.data ?? [], prefQuery.data?.columns);
    const filterKey = params.get("filterKey");
    if (!linking || !filterKey) return base;
    if (base.some((col) => col.field === filterKey)) return base;
    const match = (schemaQuery.data ?? []).find((item) => item.key === filterKey);
    if (!match?.key) return base;
    return [
      {
        field: match.key,
        header: match.label || match.key,
        type: match.type,
        key: match.key,
        isPii: match.isPii,
        isSearchAble: true,
        channelTypes: match.channelTypes,
      },
      ...base,
    ];
  }, [schemaQuery.data, prefQuery.data?.columns, linking, params]);

  useEffect(() => {
    if (schemaQuery.data?.length) {
      useSchemaStore.getState().setSchema(schemaQuery.data as never);
    }
  }, [schemaQuery.data]);

  // Everything the phonebook can search in, whether or not it is a column on screen.
  const scopeFields = useMemo(
    () =>
      (schemaQuery.data ?? [])
        .filter((attr) => attr.key && attr.key !== "labels" && attr.isSearchAble !== false)
        .map((attr) => ({ field: attr.key!, header: attr.label || attr.key! })),
    [schemaQuery.data],
  );
  const searchField =
    selectedSearchField !== ALL_FIELDS && scopeFields.some((item) => item.field === selectedSearchField)
      ? selectedSearchField
      : "";
  // Rows carry every attribute, not just the columns shown: row actions (call, text, link) read the rest.
  const readFields = useMemo(
    () => [
      ...new Set([
        ...(schemaQuery.data ?? []).map((attr) => attr.key).filter((key): key is string => Boolean(key)),
        ...columns.map((col) => col.field),
      ]),
    ],
    [schemaQuery.data, columns],
  );

  const query = useQuery({
    queryKey: [
      "customers",
      page,
      pageSize,
      search,
      searchField,
      sortField,
      sortOrder,
      labelIds.join(","),
      appliedFilter?._id ?? "",
      readFields.join(","),
    ],
    enabled: columns.length > 0 || Boolean(appliedFilter),
    // Paging keeps the current rows on screen until the next page arrives, instead of collapsing the table.
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const sort = `${sortField}:${sortOrder}`;
      if (appliedFilter) {
        return getCustomersByFilterQuery({
          filterQuery: appliedFilter.filterQuery,
          fields: readFields,
          limit: pageSize,
          offset: page * pageSize,
          sort,
        });
      }
      // Narrowing by label is a plain list query (as in unified-agent); typed text then applies to the chosen
      // attribute, or to the first name when searching all of them.
      if (labelIds.length) {
        return listPhonebookCustomers({
          limit: pageSize,
          offset: page * pageSize,
          sort,
          field: search ? searchField || "firstName" : undefined,
          value: search || undefined,
          labelIds,
        });
      }
      return searchCustomers(
        {
          limit: pageSize,
          offset: page * pageSize,
          sort,
          term: search,
          field: searchField || undefined,
          fields: readFields,
        },
        signal,
      );
    },
  });

  const rows = (query.data?.docs ?? []) as CustomerDoc[];
  const total = query.data?.totalDocs ?? 0;

  const cellText = (row: CustomerDoc, col: PhonebookColumn) => {
    const raw = formatCellValue(row[col.field]);
    if (raw === "—") return raw;
    // unified-agent phonebook: maskPIIAttribute with the "manage" scope.
    return maskPii(raw, col as unknown as SchemaAttribute, {
      full: canManage,
      masked: canMaskedPii,
    });
  };

  const linkRow = (row: CustomerDoc) => {
    if (!conversationId || !row._id || !linkingAvailable) return;
    void (async () => {
      const full = (await getCustomer(row._id!).catch(() => row)) as Record<string, unknown>;
      const selected = { ...full, _id: row._id };
      return linkCustomerWithTopic({
        conversationId,
        selected,
        confirm: openLinkConversationDialog,
      });
    })()
      .then((result) => {
        if (!result?.linked) return;
        toast.success(t("snackbar.Profile-linked-successfully"));
        useConversationStore.getState().setActive(conversationId);
        navigate(WORKSPACE_PATH);
      })
      .catch((error: unknown) => {
        const message = String(error);
        toast.error(
          message.includes("space-unavailable")
            ? t("snackbar.space-unavailable-may-delete-channel-identifer")
            : message.includes("Unable to link") || message.includes("unavailable")
              ? t("snackbar.Unable-to-link-customer")
              : message || t("snackbar.Unable-to-link-customer"),
        );
      });
  };

  const openConversation = (row: CustomerDoc) => {
    startConversationFromCustomer(row as Conversation["customer"]);
    navigate(WORKSPACE_PATH);
  };

  return (
    <DataView
      scrollKey={`${page}:${pageSize}`}
      busy={query.isPlaceholderData}
      title={linking ? undefined : t("nav.customers")}
      banner={
        linking ? (
          <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-warning/30 bg-warning-soft/80 px-3 py-2.5 shadow-soft backdrop-blur-md">
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link to={WORKSPACE_PATH}>
                <ArrowLeft className="size-3.5" />
                {t("chat-features.chats.new-conversation")}
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-warning-text">
                {linkingAvailable
                  ? t("chat-features.customer-info.link-profile")
                  : t("snackbar.Unable-to-link-customer")}
              </p>
              {linkingAvailable && params.get("filterLabel") && params.get("filterValue") ? (
                <p className="truncate text-xs text-muted-foreground">
                  {params.get("filterLabel")}: {params.get("filterValue")}
                </p>
              ) : null}
            </div>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={WORKSPACE_PATH}>{t("labels.cancel")}</Link>
            </Button>
          </div>
        ) : undefined
      }
      toolbar={
        <div className="flex w-full flex-wrap items-center gap-2">
          <CustomerSearchBar
            value={draft}
            onChange={(value) => {
              setDraft(value);
              // Typing a search replaces a saved filter; emptying the box leaves it be.
              if (value) setAppliedFilter(null);
            }}
            onSubmit={() => searchNow()}
            field={searchField || ALL_FIELDS}
            onField={setSearchField}
            fields={scopeFields}
            busy={query.isFetching}
            className="w-full sm:max-w-[28rem] sm:min-w-64 sm:flex-1"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {canLabels && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    {t("phonebook.filter-across-labels")}
                    {labelIds.length > 0 ? ` (${labelIds.length})` : ""}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-2">
                  <ul className="max-h-64 space-y-2 overflow-auto">
                    {(labelsQuery.data ?? []).map((label) => {
                      const checked = labelIds.includes(label._id);
                      return (
                        <li key={label._id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              setPage(0);
                              setAppliedFilter(null);
                              setLabelIds((current) =>
                                value === true
                                  ? [...current, label._id]
                                  : current.filter((id) => id !== label._id),
                              );
                            }}
                            id={`label-${label._id}`}
                          />
                          <label htmlFor={`label-${label._id}`} className="flex items-center gap-2">
                            <span
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: label.colorCode || "var(--primary)" }}
                            />
                            {label.name}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </PopoverContent>
              </Popover>
            )}

            <SavedFiltersMenu
              appliedId={appliedFilter?._id}
              onApply={(filter) => {
                setAppliedFilter(filter);
                clearSearch();
              }}
              onEdit={(filter) => {
                setFilterEditing(filter);
                setFilterOpen(true);
              }}
              onCreate={() => {
                setFilterEditing(null);
                setFilterOpen(true);
              }}
            />

            <Button type="button" variant="outline" size="sm" onClick={() => setPrefsOpen(true)}>
              <Columns3 className="size-3.5" />
              {t("column-preferences.column-preferences")}
            </Button>

            {columns.some((col) => col.field === sortField) && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={sortOrder === "asc" ? t("globals.ascending") : t("globals.decending")}
                onClick={() => setSortOrder((value) => (value === "asc" ? "desc" : "asc"))}
              >
                {sortOrder === "asc" ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />}
              </Button>
            )}

            {(search || labelIds.length > 0 || appliedFilter) && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearSearch();
                  setLabelIds([]);
                  setAppliedFilter(null);
                  setPage(0);
                }}
              >
                <X className="size-3.5" />
                {t("phonebook.clear-all")}
              </Button>
            )}
          </div>

          <div className="ms-auto">
            {canManage && !linking && (
              <Button type="button" onClick={() => setEditing("new")}>
                <Plus />
                {t("create-customer.create-new-customer")}
              </Button>
            )}
          </div>
        </div>
      }
      footer={
        <Pager
          page={page}
          pageSize={pageSize}
          total={total}
          onPage={setPage}
          pageSizeOptions={PAGE_SIZES}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(0);
          }}
        />
      }
    >
      {appliedFilter && (
        <div className="flex items-center gap-2 border-b border-border/50 bg-primary-soft/40 px-4 py-2 text-xs">
          <Filter className="size-3.5 text-primary" aria-hidden />
          <span>
            {t("advance-filters.advance-filter")}: <strong>{appliedFilter.filterName}</strong>
          </span>
          <button
            type="button"
            className="ms-auto inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-primary hover:bg-primary-soft"
            onClick={() => {
              setAppliedFilter(null);
              setPage(0);
            }}
          >
            <X className="size-3" aria-hidden />
            {t("phonebook.remove-filter")}
          </button>
        </div>
      )}
      <DataTable>
        <thead>
          <tr>
            {columns.map((col) => (
              <Th key={col.field}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => {
                    if (sortField === col.field) {
                      setSortOrder((value) => (value === "asc" ? "desc" : "asc"));
                    } else {
                      setSortField(col.field);
                      setSortOrder("asc");
                    }
                    setPage(0);
                  }}
                >
                  {col.header}
                  {sortField === col.field && (
                    <span className="text-[11px]">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
              </Th>
            ))}
            <Th />
          </tr>
        </thead>
        <tbody>
          {query.isLoading &&
            Array.from({ length: 6 }, (_, index) => (
              <tr key={index}>
                {columns.map((col) => (
                  <Td key={col.field}>
                    <Skeleton className="h-4 w-28" />
                  </Td>
                ))}
                <Td>
                  <Skeleton className="h-4 w-16" />
                </Td>
              </tr>
            ))}
          {!query.isLoading && rows.length === 0 && (
            <EmptyRow>
              <EmptyState
                icon={search ? SearchX : Users}
                title={search ? t("phonebook.no-match", { query: search }) : t("globals.no-data-available")}
                description={search ? t("phonebook.no-match-hint") : undefined}
                action={
                  search ? (
                    <Button type="button" size="sm" variant="outline" onClick={clearSearch}>
                      {t("phonebook.clear-search")}
                    </Button>
                  ) : undefined
                }
              />
            </EmptyRow>
          )}
          {rows.map((row) => {
            const highlighted = Boolean(topicCustomerId && row._id === topicCustomerId);
            return (
              <tr
                key={row._id ?? `${row.firstName}-${row.lastName}`}
                className={`group ${canManage ? "cursor-pointer" : ""} ${highlighted ? "bg-primary-soft/60" : ""}`}
                onClick={(event) => {
                  if (
                    (event.target as HTMLElement).closest(
                      "button, a, [role='button'], [data-prevent-row-click]",
                    )
                  ) {
                    return;
                  }
                  if (canManage && row._id) {
                    setEditing(row as CustomerRow);
                  }
                }}
              >
                {columns.map((col) => (
                  <Td key={col.field}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {cellText(row, col) === "—" ? (
                        // Nothing here: a faint placeholder, not something that reads like a value.
                        <span className="text-muted-foreground/35 select-none" title={t("globals.no-value")}>
                          <span aria-hidden>–</span>
                          <span className="sr-only">{t("globals.no-value")}</span>
                        </span>
                      ) : (
                        <span className={col.field === "firstName" ? "font-medium" : undefined}>
                          {cellText(row, col)}
                        </span>
                      )}
                      {col.field === "firstName" && canLabels && (
                        <LabelDots labels={hydrateLabels(row.labels, labelsQuery.data ?? [])} />
                      )}
                    </div>
                  </Td>
                ))}
                {/* Pinned to the right edge so the actions stay in reach when the table scrolls sideways.
                    The cell itself is transparent: nothing under it is ever covered while the actions are hidden. */}
                <Td
                  data-prevent-row-click
                  onClick={(event) => event.stopPropagation()}
                  className="sticky end-0 z-[5] w-px whitespace-nowrap"
                >
                  {/* Shown on hover or keyboard focus, and while one of its menus is open (the menu takes the
                      pointer and focus away from the row). Always shown where there is no hover (touch). The
                      backing only appears with the icons, so it covers a row's content only while in use. */}
                  <div className="ms-auto flex w-fit items-center justify-end gap-1 rounded-full px-1 py-0.5 opacity-0 transition-opacity group-focus-within:bg-surface group-focus-within:opacity-100 group-focus-within:shadow-sm group-hover:bg-surface group-hover:opacity-100 group-hover:shadow-sm has-[[data-state=open]]:bg-surface has-[[data-state=open]]:opacity-100 has-[[data-state=open]]:shadow-sm [@media(hover:none)]:opacity-100">
                    {canManage && !linking && row._id && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="hover:bg-transparent hover:opacity-70"
                        aria-label={t("globals.edit")}
                        title={t("globals.edit")}
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditing(row as CustomerRow);
                        }}
                      >
                        <Pencil className="size-3.5 text-sky-600 dark:text-sky-400" />
                      </Button>
                    )}
                    {linkingAvailable && canLink && row._id && row._id !== topicCustomerId && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="hover:bg-transparent hover:opacity-70"
                        aria-label={t("chat-features.customer-info.link-profile")}
                        title={t("chat-features.customer-info.link-profile")}
                        onClick={(event) => {
                          event.stopPropagation();
                          linkRow(row);
                        }}
                      >
                        <Link2 className="size-3.5 text-primary" />
                      </Button>
                    )}
                    {!linking && canInitiateChat && row._id && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="hover:bg-transparent hover:opacity-70"
                        aria-label={t("globals.start-conversation")}
                        title={t("globals.start-conversation")}
                        onClick={(event) => {
                          event.stopPropagation();
                          openConversation(row);
                        }}
                      >
                        <UserRound className="size-3.5 text-violet-600 dark:text-violet-400" />
                      </Button>
                    )}
                    <OutboundRowActions customer={row} hidden={linking} />
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>

      {editing && (
        <CustomerForm customer={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
      {user && prefsOpen && (
        <ColumnPreferencesDialog
          open={prefsOpen}
          onClose={() => setPrefsOpen(false)}
          userId={user.id}
          preference={prefQuery.data ?? null}
          schema={schemaQuery.data ?? []}
          columns={columns}
        />
      )}
      {filterOpen && (
        <AdvancedFilterDialog
          open={filterOpen}
          onClose={() => {
            setFilterOpen(false);
            setFilterEditing(null);
          }}
          schema={schemaQuery.data ?? []}
          labels={labelsQuery.data ?? []}
          editing={filterEditing}
          onApplied={(filter) => {
            setAppliedFilter(filter);
            clearSearch();
          }}
        />
      )}
    </DataView>
  );
}
