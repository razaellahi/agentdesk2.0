import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ExternalLink, FileText, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/core/i18n";
import { caseKeys, claimCase, getCase, reassignCase, type Case, type ReassignInput } from "../api";
import { AttachmentChips } from "../components/Attachments";
import { PriorityBadge, SlaBadge, StatusBadge } from "../components/Badges";
import { ReassignDialog, type ReassignRequest } from "../components/ReassignDialog";
import { primeCustomerNames, useCustomerLabel, useUserLabel } from "../hooks/useDisplayNames";
import { isActiveCase, routingLabel } from "../model/format";
import type { CaseAbilities } from "../model/workbench";
import { transcriptUrl } from "../model/links";
import { ActivityPanel } from "./ActivityPanel";

const COMMENT_POLL_MS = 15_000;

function linkedCustomerName(c: Case) {
  return c.conversations.map((conv) => conv.customerName?.trim()).find(Boolean) ?? null;
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-b border-border px-4 py-3">
      <h3 className="flex items-center gap-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        {title}
        {count != null && (
          <span className="rounded-full bg-surface-2 px-1.5 text-[10px] tabular-nums">{count}</span>
        )}
      </h3>
      {children}
    </section>
  );
}

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="space-y-2 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-muted-foreground">{c.caseReferenceId}</span>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("cases.detail.close")}>
            <X />
          </Button>
        </div>
        <h2 className="text-base leading-snug font-semibold text-foreground">{c.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={c.status.label} code={c.status.code} category={c.status.statusCategory} />
          <PriorityBadge priority={c.priority} variant="compact" />
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
          <div className="flex gap-2">
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

      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={query.isFetching || undefined}>
        <section className="border-b border-border px-4 py-3">
          <dl>
            <Prop label={t("cases.assignee")}>
              {c.assignedUserId ? userLabel(c.assignedUserId) : t("cases.unassigned")}
            </Prop>
            <Prop label={t("cases.routing-group")}>{routingLabel(c.assignedGroupId) ?? "—"}</Prop>
            {c.category && c.subCategory && (
              <Prop label={t("cases.category")}>
                {c.category.name} · {c.subCategory.name}
              </Prop>
            )}
            <Prop label={t("cases.customer")}>
              {customerLabel(c.customerProfileId, linkedCustomerName(c))}
            </Prop>
            <Prop label={t("cases.created")}>
              {userLabel(c.createdByUserId)} · {formatDateTime(c.createdAt)}
            </Prop>
            <Prop label={t("cases.updated")}>{formatDateTime(c.updatedAt)}</Prop>
            {c.resolvedAt && <Prop label={t("cases.resolved")}>{formatDateTime(c.resolvedAt)}</Prop>}
            {c.closedAt && <Prop label={t("cases.closed")}>{formatDateTime(c.closedAt)}</Prop>}
          </dl>
          <button
            type="button"
            className="mt-1 text-xs text-primary hover:underline"
            onClick={() => setTechnical((v) => !v)}
          >
            {technical ? t("cases.detail.hide-technical") : t("cases.detail.show-technical")}
          </button>
          {technical && (
            <dl className="mt-1 font-mono text-xs">
              <Prop label={t("cases.detail.status-code")}>{c.status.code}</Prop>
              <Prop label={t("cases.detail.case-uuid")}>{c.id}</Prop>
              {c.customerProfileId && (
                <Prop label={t("cases.detail.customer-profile")}>{c.customerProfileId}</Prop>
              )}
            </dl>
          )}
        </section>

        {c.description && (
          <Section title={t("cases.description")}>
            <p className="text-sm whitespace-pre-wrap text-foreground">{c.description}</p>
          </Section>
        )}

        {c.attachments.length > 0 && (
          <Section title={t("cases.attachments")} count={c.attachments.length}>
            <AttachmentChips attachments={c.attachments} />
          </Section>
        )}

        {c.conversations.length > 0 && (
          <Section title={t("cases.detail.linked-conversations")} count={c.conversations.length}>
            <ul className="space-y-2">
              {c.conversations.map((conv) => (
                <li key={conv.id} className="rounded-lg border border-border">
                  <a
                    href={transcriptUrl(conv.interactionId)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start justify-between gap-2 px-3 py-2 text-sm hover:bg-surface-2/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {conv.customerName ?? customerLabel(c.customerProfileId)} · {conv.agentName ?? "—"}
                      </span>
                      <span className="block text-xs text-muted-foreground">{conv.channel ?? "—"}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      {formatDateTime(conv.linkedAt)}
                      <ExternalLink className="size-3" aria-hidden />
                    </span>
                  </a>
                  {conv.summary && (
                    <div className="border-t border-border bg-surface-2/40 px-3 py-2">
                      <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <FileText className="size-3" aria-hidden />
                        {t("cases.detail.ai-summary")}
                        {conv.summaryAt && <span>· {formatDateTime(conv.summaryAt)}</span>}
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{conv.summary}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <ActivityPanel
          key={c.id}
          record={c}
          currentUserId={currentUserId}
          abilities={abilities}
          onChanged={applyUpdate}
        />
      </div>

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
