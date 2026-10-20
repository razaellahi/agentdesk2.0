import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Link2, Loader2, Unlink, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelative } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import {
  addCommentFromConversation,
  caseKeys,
  fetchWidgetCase,
  linkConversationToCase,
  type Case,
} from "../api";
import { AttachmentChips } from "../components/Attachments";
import { ActivityTabs, ActivityTimeline, type ActivityTab } from "../components/ActivityTimeline";
import { PriorityBadge, SlaBadge, StatusBadge } from "../components/Badges";
import { CopyableRef } from "../components/CopyableRef";
import { LinkedConversations } from "../components/LinkedConversations";
import { MentionComposer, type MentionComposerHandle } from "../components/MentionComposer";
import { useCaseHistory } from "../hooks/useCaseHistory";
import { useCaseMe } from "../hooks/useCaseSession";
import { useUserLabel } from "../hooks/useDisplayNames";
import { caseErrorMessage } from "../model/errors";
import { routingLabel } from "../model/format";
import type { CaseConversationContext } from "./CasesTab";
import { OpenInWorkbench } from "./OpenInWorkbench";

const COMMENT_POLL_MS = 15_000;

function Info({ label, children, sub }: { label: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-foreground/70">{label}</p>
      <div className="mt-0.5 truncate text-sm">{children}</div>
      {sub && <p className="truncate text-xs text-foreground/70">{sub}</p>}
    </div>
  );
}

/** Case detail inside the conversation tab (widget case-detail.component.ts). */
export function CaseDetailPanel({
  caseId,
  context,
  linkedNotice,
  onBack,
}: {
  caseId: string;
  context: CaseConversationContext;
  linkedNotice?: boolean;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const me = useCaseMe();
  const composer = useRef<MentionComposerHandle>(null);
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [tab, setTab] = useState<ActivityTab>("all");

  const query = useQuery({
    queryKey: ["cases", "widget", caseId],
    queryFn: () => fetchWidgetCase(caseId),
    refetchInterval: COMMENT_POLL_MS,
    refetchOnWindowFocus: true,
  });
  const c = query.data;
  const history = useCaseHistory(c);
  const userLabel = useUserLabel(me.data?.userId, [
    c?.assignedUserId,
    ...(c?.comments.map((cm) => cm.authorUserId) ?? []),
    ...history.entries.map((h) => h.performedBy),
  ]);

  const show = (kind: "success" | "error", text: string) => {
    setNotice({ kind, text });
    if (kind === "success") setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 5000);
  };

  const apply = (updated: Case) => {
    queryClient.setQueryData(["cases", "widget", caseId], updated);
    if (context.interactionId)
      void queryClient.invalidateQueries({ queryKey: caseKeys.interaction(context.interactionId) });
    void queryClient.invalidateQueries({ queryKey: ["cases", "customer"] });
  };

  const link = useMutation({
    mutationFn: () =>
      linkConversationToCase({
        caseId,
        interactionId: context.interactionId!,
        customerProfileId: context.customerProfileId,
        customerName: context.customerName,
        agentName: context.agentName,
        channel: context.channel,
      }),
    onSuccess: (updated) => {
      apply(updated);
      show("success", t("cases.conversation.linked-active"));
    },
    onError: (cause: Error) => show("error", cause.message || t("cases.conversation.link-failed")),
  });

  const comment = useMutation({
    mutationFn: () =>
      addCommentFromConversation({
        caseId,
        customerProfileId: c?.customerProfileId ?? null,
        body: body.trim(),
      }),
    onSuccess: (updated) => {
      apply(updated);
      composer.current?.clear();
      show("success", t("cases.conversation.comment-posted"));
    },
    onError: (cause: Error) => show("error", cause.message || t("cases.conversation.comment-failed")),
  });

  const header = (
    <div className="flex items-center gap-2">
      <Button
        size="icon-xs"
        variant="ghost"
        className="size-7 rounded-full"
        onClick={onBack}
        aria-label={t("cases.conversation.back")}
      >
        <ArrowLeft className="size-4" />
      </Button>
      <h4 className="min-w-0 flex-1 truncate text-sm font-semibold">{t("cases.conversation.details")}</h4>
      {c && <StatusBadge label={c.status.label} code={c.status.code} category={c.status.statusCategory} />}
      <OpenInWorkbench caseId={caseId} />
    </div>
  );

  if (query.isPending) {
    return (
      <div className="space-y-3 px-3.5 py-3">
        {header}
        <p className="flex items-center gap-2 py-4 text-sm text-foreground/70">
          <Loader2 className="size-4 animate-spin" /> {t("cases.detail.loading")}
        </p>
      </div>
    );
  }
  if (!c) {
    return (
      <div className="space-y-3 px-3.5 py-3">
        {header}
        <div
          role="alert"
          className="space-y-2 rounded-lg bg-destructive-soft p-3 text-xs text-destructive-text"
        >
          <p>{query.error ? caseErrorMessage(query.error, t) : t("cases.detail.not-found")}</p>
          <Button size="xs" variant="outline" onClick={() => void query.refetch()}>
            {t("cases.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const linkedHere =
    Boolean(context.interactionId) &&
    c.conversations.some((conv) => conv.interactionId === context.interactionId);
  const active = context.customerProfileId?.trim();
  const otherCustomer = Boolean(
    active && c.customerProfileId?.trim() && active !== c.customerProfileId.trim(),
  );
  const customerLabel = otherCustomer
    ? (c.customerProfileId ?? t("cases.conversation.other-customer"))
    : (context.customerName ?? t("cases.customer"));

  const askLink = async () => {
    if (linkedHere || link.isPending) return;
    const ok = await confirm({
      title: t("cases.conversation.link-title"),
      description: t("cases.conversation.link-description", { ref: c.caseReferenceId, title: c.title }),
      confirmLabel: t("cases.conversation.link"),
    });
    if (ok) link.mutate();
  };

  return (
    <div className="space-y-3 px-3.5 py-3">
      {header}
      {linkedNotice && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-primary-soft/50 px-3 py-2 text-xs">
          <Link2 className="size-3.5 shrink-0 text-primary" aria-hidden />
          {t("cases.conversation.already-linked-this")}
        </p>
      )}
      {otherCustomer && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning-text"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{t("cases.conversation.mismatch")}</p>
            <p>{t("cases.conversation.mismatch-hint", { id: c.customerProfileId ?? "—" })}</p>
          </div>
        </div>
      )}
      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
            notice.kind === "error"
              ? "bg-destructive-soft text-destructive-text"
              : "bg-success-soft text-success-text",
          )}
        >
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label={t("cases.dismiss")}>
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CopyableRef value={c.caseReferenceId} />
          <PriorityBadge priority={c.priority} variant="tag" />
        </div>
        <h5 className="text-base leading-snug font-semibold tracking-tight">{c.title}</h5>
        {c.description && <p className="text-xs whitespace-pre-wrap text-foreground/70">{c.description}</p>}
        <AttachmentChips attachments={c.attachments} />
        {context.interactionId &&
          (linkedHere ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-success-text">
              <Link2 className="size-3.5" aria-hidden />
              {t("cases.conversation.linked")}
            </p>
          ) : (
            <Button size="sm" className="w-full" disabled={link.isPending} onClick={() => void askLink()}>
              {link.isPending ? <Loader2 className="animate-spin" /> : <Unlink />}
              {link.isPending ? t("cases.conversation.linking") : t("cases.conversation.link-active")}
            </Button>
          ))}
      </section>

      <section
        className="grid grid-cols-2 gap-x-4 gap-y-3.5 rounded-xl border-t border-border bg-surface p-3.5"
        aria-label={t("cases.conversation.metadata")}
      >
        <Info label={t("cases.customer")}>{customerLabel}</Info>
        <Info label={t("cases.category")} sub={c.subCategory?.name ?? t("cases.conversation.no-sub")}>
          {c.category?.name ?? t("cases.conversation.uncategorized")}
        </Info>
        <Info
          label={t("cases.conversation.routed-group")}
          sub={`${t("cases.assignee")}: ${c.assignedUserId ? userLabel(c.assignedUserId) : t("cases.unassigned")}`}
        >
          {routingLabel(c.assignedGroupId) ?? t("cases.conversation.not-routed")}
        </Info>
        <Info label={t("cases.conversation.sla")}>
          {c.slaState && c.slaTimeLabel ? (
            <SlaBadge
              slaState={c.slaState}
              slaTimeLabel={c.slaTimeLabel}
              slaMinutesRemaining={c.slaMinutesRemaining}
            />
          ) : (
            t("cases.conversation.no-sla")
          )}
        </Info>
        <Info label={t("cases.created")} sub={formatRelative(c.createdAt)}>
          {formatDate(c.createdAt)}
        </Info>
        <Info label={t("cases.conversation.last-updated")} sub={formatRelative(c.updatedAt)}>
          {formatDate(c.updatedAt)}
        </Info>
      </section>

      {c.conversations.length > 0 && (
        <section className="space-y-2">
          <h5 className="flex items-center gap-2 text-xs font-medium text-foreground/70">
            {t("cases.detail.linked-conversations")}
            <span className="rounded-full bg-surface-2 px-1.5 text-xs tabular-nums">
              {c.conversations.length}
            </span>
          </h5>
          <LinkedConversations
            conversations={c.conversations}
            fallbackName={customerLabel}
            currentInteractionId={context.interactionId}
            customerProfileId={c.customerProfileId ?? context.customerProfileId}
          />
        </section>
      )}

      <section className="space-y-3" aria-label={t("cases.activity.label")}>
        <ActivityTabs tab={tab} onTab={setTab} />
        <ActivityTimeline
          tab={tab}
          comments={c.comments}
          history={history.entries}
          historyLoading={history.loading}
          historyLimited={history.limited}
          userLabel={userLabel}
        />
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim() && !comment.isPending) comment.mutate();
          }}
        >
          <label htmlFor={`conv-comment-${caseId}`} className="text-xs font-medium text-foreground/70">
            {t("cases.conversation.add-comment")}
          </label>
          <MentionComposer
            ref={composer}
            id={`conv-comment-${caseId}`}
            placeholder={t("cases.conversation.comment-placeholder")}
            disabled={comment.isPending}
            onChange={setBody}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={comment.isPending || !body.trim()}>
              {comment.isPending && <Loader2 className="animate-spin" />}
              {t("cases.conversation.post-comment")}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
