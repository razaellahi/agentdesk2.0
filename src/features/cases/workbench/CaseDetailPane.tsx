import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import { caseKeys, claimCase, getCase, reassignCase, type Case, type ReassignInput } from "../api";
import { AttachmentChips } from "../components/Attachments";
import { PriorityBadge, SlaBadge, StatusBadge } from "../components/Badges";
import { CopyableRef } from "../components/CopyableRef";
import { Initials } from "../components/Fields";
import { LinkedConversations } from "../components/LinkedConversations";
import { ReassignDialog, type ReassignRequest } from "../components/ReassignDialog";
import { primeCustomerNames, useCustomerLabel, useUserLabel } from "../hooks/useDisplayNames";
import { isActiveCase, routingLabel } from "../model/format";
import type { CaseAbilities } from "../model/workbench";
import { ActivityPanel } from "./ActivityPanel";

const COMMENT_POLL_MS = 15_000;

function linkedCustomerName(c: Case) {
  return c.conversations.map((conv) => conv.customerName?.trim()).find(Boolean) ?? null;
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 min-w-0 text-sm break-words text-foreground">{children}</dd>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {title}
        {count != null && (
          <span className="rounded-full bg-surface-2 px-1.5 text-[10px] tabular-nums">{count}</span>
        )}
      </h3>
      {children}
    </section>
  );
}

type PaneTab = "overview" | "activity";

/** Right-hand case pane of the Workbench (case-detail-pane.component.ts). */
export function CaseDetailPane({
  caseId,
  currentUserId,
  abilities,
  agentClaimAllowed,
  onUpdated,
  onClose,
}: {
  caseId: string;
  currentUserId: string | null;
  abilities: CaseAbilities;
  agentClaimAllowed: boolean;
  onUpdated: (updated: Case) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [technical, setTechnical] = useState(false);
  const [tab, setTab] = useState<PaneTab>("overview");
  const [actionError, setActionError] = useState<string | null>(null);
  const [reassign, setReassign] = useState<ReassignRequest | null>(null);

  const query = useQuery({
    queryKey: caseKeys.detail(caseId),
    queryFn: () => getCase(caseId),
    // New comments from teammates show up without a manual refresh (paused while hidden).
    refetchInterval: COMMENT_POLL_MS,
    refetchOnWindowFocus: true,
  });
  const record = query.data ?? null;
  const userLabel = useUserLabel(currentUserId, [record?.assignedUserId, record?.createdByUserId]);
  const customerLabel = useCustomerLabel();

  useEffect(() => {
    if (record?.customerProfileId)
      primeCustomerNames([{ id: record.customerProfileId, hint: linkedCustomerName(record) }]);
  }, [record]);

  const applyUpdate = (updated: Case) => {
    queryClient.setQueryData(caseKeys.detail(updated.id), updated);
    onUpdated(updated);
  };

  const act = useMutation({
    mutationFn: (action: { kind: "claim" } | { kind: "reassign"; input: ReassignInput }) =>
      action.kind === "claim" ? claimCase(caseId) : reassignCase(caseId, action.input),
    onMutate: () => setActionError(null),
    onSuccess: applyUpdate,
    onError: (error: Error) => setActionError(error.message || t("cases.detail.action-failed")),
  });

  if (query.isPending) {
    return (
      <div className="grid h-full place-items-center p-6 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> {t("cases.detail.loading")}
        </p>
      </div>
    );
  }
  if (!record) {
    return (
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm"
      >
        <AlertCircle className="size-6 text-destructive-text" aria-hidden />
        <p>{query.error?.message ?? t("cases.detail.not-found")}</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          {t("cases.close")}
        </Button>
      </div>
    );
  }

  const c = record;
  const active = isActiveCase(c);
  const canClaim = !c.assignedUserId && agentClaimAllowed && active;
  const canReassign = abilities.reassign && active;

  const owner = c.assignedUserId ? userLabel(c.assignedUserId) : null;
  const tabs: { id: PaneTab; label: string; count?: number }[] = [
    { id: "overview", label: t("cases.detail.overview") },
    { id: "activity", label: t("cases.activity.title"), count: c.comments.length },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="space-y-2.5 px-5 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CopyableRef value={c.caseReferenceId} />
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("cases.detail.close")}>
            <X />
          </Button>
        </div>
        <h2 className="text-lg leading-snug font-semibold tracking-tight text-foreground">{c.title}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <StatusBadge label={c.status.label} code={c.status.code} category={c.status.statusCategory} />
          <PriorityBadge priority={c.priority} variant="tag" />
          {c.slaState && c.slaTimeLabel && (
            <SlaBadge
              slaState={c.slaState}
              slaTimeLabel={c.slaTimeLabel}
              slaMinutesRemaining={c.slaMinutesRemaining}
              slaPausedAt={c.slaPausedAt}
            />
          )}
        </div>
        {(canClaim || canReassign) && (
          <div className="flex gap-2 pt-0.5">
            {canClaim && (
              <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ kind: "claim" })}>
                {t("cases.claim")}
              </Button>
            )}
            {canReassign && (
              <Button
                size="sm"
                variant="outline"
                disabled={act.isPending}
                onClick={() =>
                  setReassign({
                    subject: c.caseReferenceId,
                    currentGroupId: c.assignedGroupId,
                    currentAssigneeId: c.assignedUserId,
                    verb: c.assignedUserId ? "reassign" : "assign",
                  })
                }
              >
                {c.assignedUserId ? t("cases.reassign.reassign") : t("cases.reassign.assign")}
              </Button>
            )}
          </div>
        )}
        {actionError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-destructive-soft px-3 py-2 text-xs text-destructive-text"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span className="flex-1">{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} aria-label={t("cases.dismiss")}>
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </header>

      <div role="tablist" className="flex gap-5 border-b border-border px-5">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 py-2 text-sm font-medium transition-colors",
              tab === item.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {item.count ? (
              <span className="rounded-full bg-surface-2 px-1.5 text-[10px] text-muted-foreground tabular-nums">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "activity" ? (
        <ActivityPanel
          key={c.id}
          record={c}
          currentUserId={currentUserId}
          abilities={abilities}
          onChanged={applyUpdate}
        />
      ) : (
        <div
          className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5"
          aria-busy={query.isFetching || undefined}
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Prop label={t("cases.assignee")}>
              {owner ? (
                <span className="flex items-center gap-2">
                  <Initials name={owner} />
                  {owner}
                </span>
              ) : (
                <span className="text-muted-foreground">{t("cases.unassigned")}</span>
              )}
            </Prop>
            <Prop label={t("cases.routing-group")}>{routingLabel(c.assignedGroupId) ?? "—"}</Prop>
            <Prop label={t("cases.customer")}>
              {customerLabel(c.customerProfileId, linkedCustomerName(c))}
            </Prop>
            <Prop label={t("cases.category")}>
              {c.category ? [c.category.name, c.subCategory?.name].filter(Boolean).join(" · ") : "—"}
            </Prop>
            <Prop label={t("cases.created")}>
              {formatDateTime(c.createdAt)}
              <span className="block text-xs text-muted-foreground">{userLabel(c.createdByUserId)}</span>
            </Prop>
            <Prop label={t("cases.updated")}>{formatDateTime(c.updatedAt)}</Prop>
            {c.resolvedAt && <Prop label={t("cases.resolved")}>{formatDateTime(c.resolvedAt)}</Prop>}
            {c.closedAt && <Prop label={t("cases.closed")}>{formatDateTime(c.closedAt)}</Prop>}
          </dl>

          {c.description && (
            <Section title={t("cases.description")}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{c.description}</p>
            </Section>
          )}

          {c.attachments.length > 0 && (
            <Section title={t("cases.attachments")} count={c.attachments.length}>
              <AttachmentChips attachments={c.attachments} />
            </Section>
          )}

          {c.conversations.length > 0 && (
            <Section title={t("cases.detail.linked-conversations")} count={c.conversations.length}>
              <LinkedConversations
                conversations={c.conversations}
                fallbackName={customerLabel(c.customerProfileId)}
                customerProfileId={c.customerProfileId}
              />
            </Section>
          )}

          <div>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-primary"
              onClick={() => setTechnical((v) => !v)}
            >
              {technical ? t("cases.detail.hide-technical") : t("cases.detail.show-technical")}
            </button>
            {technical && (
              <dl className="mt-3 grid grid-cols-1 gap-3 rounded-lg bg-surface-2/60 p-3 text-xs">
                <Prop label={t("cases.detail.status-code")}>{c.status.code}</Prop>
                <Prop label={t("cases.detail.case-uuid")}>{c.id}</Prop>
                {c.customerProfileId && (
                  <Prop label={t("cases.detail.customer-profile")}>{c.customerProfileId}</Prop>
                )}
              </dl>
            )}
          </div>
        </div>
      )}

      <ReassignDialog
        request={reassign}
        onCancel={() => setReassign(null)}
        onSubmit={(input) => {
          setReassign(null);
          act.mutate({ kind: "reassign", input });
        }}
      />
    </div>
  );
}
