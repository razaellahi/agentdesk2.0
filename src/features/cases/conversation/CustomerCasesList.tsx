import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  FolderTree,
  Inbox,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  Unlink,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchField } from "@/components/common/ListChrome";
import { confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatRelative } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import {
  caseKeys,
  fetchCustomerCaseInsight,
  linkConversationToCase,
  searchAllCases,
  searchCustomerCases,
  type CaseSearchHit,
  type CaseSummary,
} from "../api";
import { PriorityBadge, SlaBadge, StatusBadge } from "../components/Badges";
import type { CaseConversationContext } from "./CasesTab";
import { OpenInWorkbench } from "./OpenInWorkbench";

type StatusFilter = "all" | "open" | "closed";
type Row = CaseSummary & { matchesActiveCustomer: boolean };

const CASE_REF_RE = /^CASE-\d{8}-\d+$/i;

function mergeHits(customerHits: CaseSearchHit[], tenantHits: CaseSearchHit[]): Row[] {
  const merged = new Map<string, Row>();
  for (const hit of [...customerHits, ...tenantHits])
    merged.set(hit.case.id, { ...hit.case, matchesActiveCustomer: hit.matchesActiveCustomer });
  return [...merged.values()];
}

/** Every case of the conversation's customer, linked one first (customer-cases.component.ts). */
export function CustomerCasesList({
  context,
  linkedCase,
  linkedLoading,
  onOpen,
  onCreate,
}: {
  context: CaseConversationContext;
  linkedCase: CaseSummary | null;
  linkedLoading: boolean;
  onOpen: (caseId: string) => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [searchAll, setSearchAll] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // The linked case may belong to a better-resolved profile than the conversation's own.
  const profileId = linkedCase?.customerProfileId?.trim() || context.customerProfileId;
  const insight = useQuery({
    queryKey: caseKeys.customerCases(profileId ?? ""),
    queryFn: () => fetchCustomerCaseInsight(profileId!),
    enabled: Boolean(profileId) && !linkedLoading,
  });

  const tenantSearch = CASE_REF_RE.test(debounced) || searchAll;
  const results = useQuery({
    queryKey: ["cases", "conversation-search", context.customerProfileId, debounced, tenantSearch],
    queryFn: async () => {
      const [customer, tenant] = await Promise.all([
        context.customerProfileId
          ? searchCustomerCases(context.customerProfileId, debounced)
          : Promise.resolve([]),
        tenantSearch ? searchAllCases(debounced, context.customerProfileId ?? "") : Promise.resolve([]),
      ]);
      return mergeHits(customer, tenant);
    },
    enabled: Boolean(debounced),
  });

  const baseRows = useMemo((): Row[] => {
    const byId = new Map<string, CaseSummary>();
    if (linkedCase) byId.set(linkedCase.id, linkedCase);
    for (const row of insight.data?.recentCases ?? []) if (!byId.has(row.id)) byId.set(row.id, row);
    const isLinkedHere = (c: CaseSummary) =>
      c.id === linkedCase?.id || c.conversations.some((conv) => conv.interactionId === context.interactionId);
    return [...byId.values()]
      .sort((a, b) => {
        if (isLinkedHere(a) !== isLinkedHere(b)) return isLinkedHere(a) ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .map((row) => ({ ...row, matchesActiveCustomer: true }));
  }, [insight.data, linkedCase, context.interactionId]);

  const searching = Boolean(search.trim());
  const source = searching ? (results.data ?? []) : baseRows;
  const rows =
    filter === "all"
      ? source
      : source.filter((row) => Boolean(row.status.isTerminal) === (filter === "closed"));
  const searchPending = searching && (debounced !== search.trim() || results.isFetching);

  const isLinked = (c: CaseSummary) =>
    c.conversations.some((conv) => conv.interactionId === context.interactionId);
  const isThisChat = (c: CaseSummary) => isLinked(c) || c.id === linkedCase?.id;

  const link = useMutation({
    mutationFn: (c: CaseSummary) =>
      linkConversationToCase({
        caseId: c.id,
        interactionId: context.interactionId,
        customerProfileId: context.customerProfileId,
        customerName: context.customerName,
        agentName: context.agentName,
        channel: context.channel,
      }),
    onMutate: () => setNotice(null),
    onSuccess: (updated) => {
      setNotice({
        kind: "success",
        text: t("cases.conversation.linked-to", { ref: updated.caseReferenceId }),
      });
      void queryClient.invalidateQueries({ queryKey: caseKeys.interaction(context.interactionId) });
      void queryClient.invalidateQueries({ queryKey: ["cases", "customer"] });
      void queryClient.invalidateQueries({ queryKey: ["cases", "conversation-search"] });
    },
    onError: (cause: Error) =>
      setNotice({ kind: "error", text: cause.message || t("cases.conversation.link-failed") }),
  });

  const askLink = async (c: CaseSummary) => {
    if (isLinked(c) || link.isPending) return;
    const ok = await confirm({
      title: t("cases.conversation.link-title"),
      description: t("cases.conversation.link-description", { ref: c.caseReferenceId, title: c.title }),
      confirmLabel: t("cases.conversation.link"),
    });
    if (ok) link.mutate(c);
  };

  const loading = linkedLoading || (Boolean(profileId) && insight.isPending);
  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: t("cases.filters.all") },
    { id: "open", label: t("cases.conversation.open") },
    { id: "closed", label: t("cases.conversation.closed") },
  ];

  return (
    <div className="space-y-3 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          {t("cases.tab")}
        </h4>
        <div className="flex items-center gap-1">
          {!linkedCase && !linkedLoading && (
            <Button size="xs" onClick={onCreate}>
              <Plus />
              {t("cases.new-case")}
            </Button>
          )}
          <OpenInWorkbench />
        </div>
      </div>

      {linkedCase && (
        <section
          className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary-soft/40 p-3"
          data-testid="linked-conversation-banner"
        >
          <Link2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-medium text-foreground">{t("cases.conversation.already-linked")}</p>
            <p className="truncate text-muted-foreground">
              {linkedCase.caseReferenceId} · {linkedCase.title}
            </p>
          </div>
          <Button size="xs" onClick={() => onOpen(linkedCase.id)}>
            {t("cases.conversation.open-case")}
          </Button>
        </section>
      )}

      {!context.customerProfileId && !linkedCase ? (
        <p className="rounded-lg bg-surface-2/60 p-3 text-xs text-muted-foreground">
          {t("cases.conversation.no-customer")}
        </p>
      ) : (
        <>
          <div className="flex gap-1" role="group" aria-label={t("cases.conversation.status-filter")}>
            {filters.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs",
                  filter === option.id
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="relative">
              <SearchField value={search} onChange={setSearch} placeholder={t("cases.conversation.search")} />
              {searchPending && (
                <Loader2 className="absolute end-8 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <label
              className="flex items-center gap-2 text-xs text-muted-foreground"
              data-testid="search-all-toggle"
            >
              <Switch checked={searchAll} onCheckedChange={setSearchAll} size="sm" />
              {t("cases.conversation.search-all")}
            </label>
          </div>

          {notice && (
            <p
              role={notice.kind === "error" ? "alert" : "status"}
              className={cn(
                "rounded-lg px-3 py-2 text-xs",
                notice.kind === "error"
                  ? "bg-destructive-soft text-destructive-text"
                  : "bg-success-soft text-success-text",
              )}
            >
              {notice.text}
            </p>
          )}

          {loading ? (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t("cases.loading")}
            </p>
          ) : insight.error && !searching ? (
            <div
              role="alert"
              className="space-y-2 rounded-lg bg-destructive-soft p-3 text-xs text-destructive-text"
            >
              <p>{insight.error.message}</p>
              <Button size="xs" variant="outline" onClick={() => void insight.refetch()}>
                {t("cases.retry")}
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <Inbox className="size-6" aria-hidden />
              {searching ? (
                <p>
                  {searchPending
                    ? t("cases.loading")
                    : t("cases.conversation.no-match", { query: search.trim() })}
                </p>
              ) : source.length > 0 ? (
                <>
                  <p>
                    {filter === "open" ? t("cases.conversation.no-open") : t("cases.conversation.no-closed")}
                  </p>
                  <Button size="xs" variant="outline" onClick={() => setFilter("all")}>
                    {t("cases.conversation.show-all")}
                  </Button>
                </>
              ) : (
                <>
                  <p>{t("cases.conversation.none")}</p>
                  {!linkedCase && (
                    <Button size="xs" onClick={onCreate}>
                      {t("cases.conversation.create-first")}
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((c) => (
                <li key={c.id}>
                  <article
                    className={cn(
                      "rounded-xl border bg-surface p-3 transition-colors",
                      isThisChat(c) ? "border-primary/50" : "border-border",
                    )}
                  >
                    <button
                      type="button"
                      className="block w-full space-y-1.5 text-start"
                      onClick={() => onOpen(c.id)}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {c.caseReferenceId}
                        </span>
                        <span className="flex flex-wrap items-center justify-end gap-1">
                          {!c.matchesActiveCustomer && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] text-warning-text">
                              <UserRound className="size-3" aria-hidden />{" "}
                              {t("cases.conversation.other-customer")}
                            </span>
                          )}
                          {isThisChat(c) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] text-primary">
                              <MessageSquare className="size-3" aria-hidden />{" "}
                              {t("cases.conversation.this-chat")}
                            </span>
                          )}
                          <StatusBadge
                            label={c.status.label}
                            code={c.status.code}
                            category={c.status.statusCategory}
                          />
                        </span>
                      </span>
                      <span className="block text-sm font-medium text-foreground">{c.title}</span>
                      {c.description && (
                        <span className="line-clamp-2 block text-xs text-muted-foreground">
                          {c.description}
                        </span>
                      )}
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <PriorityBadge priority={c.priority} />
                        {c.category && (
                          <span className="inline-flex items-center gap-1">
                            <FolderTree className="size-3" aria-hidden />
                            {c.category.name}
                            {c.subCategory ? ` / ${c.subCategory.name}` : ""}
                          </span>
                        )}
                        {c.slaState && c.slaTimeLabel && (
                          <SlaBadge
                            slaState={c.slaState}
                            slaTimeLabel={c.slaTimeLabel}
                            slaMinutesRemaining={c.slaMinutesRemaining}
                          />
                        )}
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3" aria-hidden />
                          {formatRelative(c.createdAt)}
                        </span>
                      </span>
                    </button>
                    <div className="mt-2 border-t border-border pt-2">
                      <Button
                        size="xs"
                        variant={isLinked(c) ? "ghost" : "outline"}
                        disabled={isLinked(c) || (link.isPending && link.variables?.id === c.id)}
                        onClick={() => void askLink(c)}
                      >
                        {isLinked(c) ? (
                          <Link2 />
                        ) : link.isPending && link.variables?.id === c.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Unlink />
                        )}
                        {isLinked(c)
                          ? t("cases.conversation.linked")
                          : link.isPending && link.variables?.id === c.id
                            ? t("cases.conversation.linking")
                            : t("cases.conversation.link")}
                      </Button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
