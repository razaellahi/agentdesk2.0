import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Inbox, Link2, Loader2, Plus, Unlink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchField } from "@/components/common/ListChrome";
import { confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
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
import { CopyableRef } from "../components/CopyableRef";
import { RefId } from "../components/Fields";
import { caseErrorMessage } from "../model/errors";
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

  // Search covers this customer's cases in every status. An exact case reference is unique,
  // so it also finds a case that belongs to another customer.
  const tenantSearch = CASE_REF_RE.test(debounced);
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
    Boolean(context.interactionId) &&
    c.conversations.some((conv) => conv.interactionId === context.interactionId);
  const isThisChat = (c: CaseSummary) => isLinked(c) || c.id === linkedCase?.id;

  const link = useMutation({
    mutationFn: (c: CaseSummary) =>
      linkConversationToCase({
        caseId: c.id,
        interactionId: context.interactionId!,
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
      void queryClient.invalidateQueries({ queryKey: caseKeys.interaction(context.interactionId ?? "") });
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

  const trimmed = search.trim();
  const searchHint = CASE_REF_RE.test(trimmed)
    ? t("cases.conversation.hint-ref")
    : trimmed.toUpperCase().startsWith("CASE-")
      ? t("cases.conversation.hint-format")
      : "";
  const contextLine = searching
    ? results.data
      ? t("cases.conversation.n-results", { count: rows.length })
      : ""
    : insight.data
      ? [
          t("cases.conversation.last-hours", { hours: insight.data.windowHours }),
          t("cases.conversation.n-open", { count: insight.data.openCaseCount }),
        ].join(" · ")
      : "";

  const loading = linkedLoading || (Boolean(profileId) && insight.isPending);
  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: t("cases.filters.all") },
    { id: "open", label: t("cases.conversation.open") },
    { id: "closed", label: t("cases.conversation.closed") },
  ];

  return (
    <div className="space-y-3 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <div
          role="group"
          aria-label={t("cases.conversation.status-filter")}
          className="inline-flex gap-0.5 rounded-lg bg-surface-2 p-0.5"
        >
          {filters.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === option.id
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-foreground/70 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {!linkedCase && !linkedLoading && (
            <Button size="xs" disabled={!context.customerProfileId} onClick={onCreate}>
              <Plus />
              {t("cases.new-case")}
            </Button>
          )}
        </div>
      </div>

      {linkedCase && (
        <section
          className="space-y-2.5 rounded-xl border border-primary/30 bg-primary-soft/40 p-3.5"
          data-testid="linked-conversation-banner"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
            <Link2 className="size-3.5" aria-hidden />
            {t("cases.conversation.already-linked")}
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{linkedCase.title}</p>
              <RefId value={linkedCase.caseReferenceId} />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 bg-surface"
              onClick={() => onOpen(linkedCase.id)}
            >
              {t("cases.conversation.open-case")}
            </Button>
          </div>
        </section>
      )}

      {!context.customerProfileId && !linkedCase ? (
        <p className="rounded-lg border border-border bg-surface p-3 text-xs text-foreground/70">
          {t("cases.conversation.no-customer")}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <div className="relative">
              <SearchField value={search} onChange={setSearch} placeholder={t("cases.conversation.search")} />
              {searchPending && (
                <Loader2 className="absolute end-8 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-foreground/70" />
              )}
            </div>
            {searchHint && <p className="text-xs text-foreground/70">{searchHint}</p>}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-foreground/70 tabular-nums">{contextLine}</p>
              <OpenInWorkbench labelled />
            </div>
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
            <p className="flex items-center gap-2 py-4 text-sm text-foreground/70">
              <Loader2 className="size-4 animate-spin" /> {t("cases.loading")}
            </p>
          ) : insight.error && !searching ? (
            <div
              role="alert"
              className="space-y-2 rounded-lg bg-destructive-soft p-3 text-xs text-destructive-text"
            >
              <p>{caseErrorMessage(insight.error, t)}</p>
              <Button size="xs" variant="outline" onClick={() => void insight.refetch()}>
                {t("cases.retry")}
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-foreground/70">
              {(searching || source.length > 0) && <Inbox className="size-6" aria-hidden />}
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
                  <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
                    <Briefcase className="size-5" aria-hidden />
                  </span>
                  <p className="text-sm font-medium text-foreground">{t("cases.conversation.none")}</p>
                  <Button
                    size="sm"
                    className="h-9 rounded-full px-4 shadow-2xs"
                    disabled={!context.customerProfileId}
                    onClick={onCreate}
                  >
                    <Plus className="size-4" aria-hidden />
                    {t("cases.conversation.create-first")}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((c) => {
                const linkedHere = isLinked(c);
                const linking = link.isPending && link.variables?.id === c.id;
                return (
                  <li key={c.id}>
                    <article
                      className={cn(
                        "group rounded-xl border bg-surface transition-colors hover:border-border-strong",
                        isThisChat(c) ? "border-primary/40" : "border-border",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
                        <CopyableRef value={c.caseReferenceId} />
                        <StatusBadge
                          label={c.status.label}
                          code={c.status.code}
                          category={c.status.statusCategory}
                        />
                      </div>
                      <button
                        type="button"
                        className="block w-full space-y-1.5 rounded-t-xl px-3.5 pt-1.5 pb-2.5 text-start"
                        onClick={() => onOpen(c.id)}
                      >
                        <span className="block text-sm leading-snug font-medium text-foreground">
                          {c.title}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 text-xs text-foreground/70">
                          <PriorityBadge priority={c.priority} variant="compact" />
                          {c.slaState && c.slaTimeLabel && (
                            <SlaBadge
                              slaState={c.slaState}
                              slaTimeLabel={c.slaTimeLabel}
                              slaMinutesRemaining={c.slaMinutesRemaining}
                            />
                          )}
                          <span>{formatRelative(c.createdAt)}</span>
                          {!c.matchesActiveCustomer && (
                            <span className="text-warning-text">
                              · {t("cases.conversation.other-customer")}
                            </span>
                          )}
                        </span>
                      </button>
                      {context.interactionId && (
                        <div className="flex items-center justify-between border-t border-border px-3.5 py-2">
                          {linkedHere ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-success-text">
                              <Link2 className="size-3.5" aria-hidden />
                              {isThisChat(c) && t("cases.conversation.this-chat")}
                              {!isThisChat(c) && t("cases.conversation.linked")}
                            </span>
                          ) : (
                            <Button
                              size="xs"
                              variant="ghost"
                              className="-ms-2 text-foreground/70 hover:text-primary"
                              disabled={linking}
                              onClick={() => void askLink(c)}
                            >
                              {linking ? <Loader2 className="animate-spin" /> : <Unlink />}
                              {linking ? t("cases.conversation.linking") : t("cases.conversation.link")}
                            </Button>
                          )}
                        </div>
                      )}
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
