import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Link2,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Radio,
  Unlink,
  X,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatRelative } from "@/core/i18n";
import { initials } from "@/shared/lib/initials";
import { cn } from "@/shared/lib/utils";
import {
  addCommentFromConversation,
  caseKeys,
  fetchWidgetCase,
  linkConversationToCase,
  type Case,
} from "../api";
import { AttachmentChips } from "../components/Attachments";
import { PriorityBadge, SlaBadge, StatusBadge } from "../components/Badges";
import { MentionComposer, type MentionComposerHandle } from "../components/MentionComposer";
import { useCaseMe } from "../hooks/useCaseSession";
import { useUserLabel } from "../hooks/useDisplayNames";
import { formatCommentBody } from "../model/format";
import { transcriptUrl } from "../model/links";
import type { CaseConversationContext } from "./CasesTab";
import { OpenInWorkbench } from "./OpenInWorkbench";

const COMMENT_POLL_MS = 15_000;

function Info({ label, children, sub }: { label: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{label}</p>
      <div className="truncate text-xs font-medium">{children}</div>
      {sub && <p className="truncate text-[11px] text-muted-foreground">{sub}</p>}
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

  const query = useQuery({
    queryKey: ["cases", "widget", caseId],
    queryFn: () => fetchWidgetCase(caseId),
    refetchInterval: COMMENT_POLL_MS,
    refetchOnWindowFocus: true,
  });
  const c = query.data;
  const userLabel = useUserLabel(me.data?.userId, [
    c?.assignedUserId,
    ...(c?.comments.map((cm) => cm.authorUserId) ?? []),
  ]);

  const show = (kind: "success" | "error", text: string) => {
    setNotice({ kind, text });
    if (kind === "success") setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 5000);
  };

  const apply = (updated: Case) => {
    queryClient.setQueryData(["cases", "widget", caseId], updated);
    void queryClient.invalidateQueries({ queryKey: caseKeys.interaction(context.interactionId) });
    void queryClient.invalidateQueries({ queryKey: ["cases", "customer"] });
  };

  const link = useMutation({
    mutationFn: () =>
      linkConversationToCase({
        caseId,
        interactionId: context.interactionId,
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
        <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
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
          <p>{query.error?.message ?? t("cases.detail.not-found")}</p>
          <Button size="xs" variant="outline" onClick={() => void query.refetch()}>
            {t("cases.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const linkedHere = c.conversations.some((conv) => conv.interactionId === context.interactionId);
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

      <section className="space-y-2 rounded-xl border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">{c.caseReferenceId}</span>
          <PriorityBadge priority={c.priority} />
        </div>
        <h5 className="text-sm font-semibold">{c.title}</h5>
        {c.description && (
          <p className="text-xs whitespace-pre-wrap text-muted-foreground">{c.description}</p>
        )}
        <Button
          size="xs"
          variant={linkedHere ? "ghost" : "outline"}
          disabled={linkedHere || link.isPending}
          onClick={() => void askLink()}
        >
          {linkedHere ? <Link2 /> : link.isPending ? <Loader2 className="animate-spin" /> : <Unlink />}
          {linkedHere
            ? t("cases.conversation.linked")
            : link.isPending
              ? t("cases.conversation.linking")
              : t("cases.conversation.link-active")}
        </Button>
      </section>

      <section
        className="grid grid-cols-2 gap-3 rounded-xl border border-border p-3"
        aria-label={t("cases.conversation.metadata")}
      >
        <Info label={t("cases.customer")} sub={c.customerProfileId ?? t("cases.conversation.no-profile")}>
          {customerLabel}
        </Info>
        <Info label={t("cases.category")} sub={c.subCategory?.name ?? t("cases.conversation.no-sub")}>
          {c.category?.name ?? t("cases.conversation.uncategorized")}
        </Info>
        <Info
          label={t("cases.conversation.routed-group")}
          sub={`${t("cases.assignee")}: ${c.assignedUserId ? userLabel(c.assignedUserId) : t("cases.unassigned")}`}
        >
          {c.assignedGroupId ?? t("cases.conversation.not-routed")}
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
          {formatDateTime(c.createdAt)}
        </Info>
        <Info label={t("cases.conversation.last-updated")} sub={formatRelative(c.updatedAt)}>
          {formatDateTime(c.updatedAt)}
        </Info>
      </section>

      <section className="space-y-2">
        <h5 className="flex items-center gap-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          {t("cases.detail.linked-conversations")}
          <span className="rounded-full bg-surface-2 px-1.5 text-[10px] tabular-nums">
            {c.conversations.length}
          </span>
        </h5>
        {c.conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("cases.conversation.no-conversations")}</p>
        ) : (
          <ul className="space-y-1.5">
            {c.conversations.map((conv) => {
              const current = conv.interactionId === context.interactionId;
              return (
                <li key={conv.id}>
                  <a
                    href={transcriptUrl(conv.interactionId)}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs hover:bg-surface-2/60",
                      current ? "border-primary/50 bg-primary-soft/30" : "border-border",
                    )}
                  >
                    {current ? (
                      <Radio className="mt-0.5 size-3.5 text-primary" />
                    ) : (
                      <MessagesSquare className="mt-0.5 size-3.5 text-muted-foreground" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {conv.customerName ?? customerLabel} · {conv.agentName ?? "—"}
                      </span>
                      <span className="block text-muted-foreground">
                        {conv.channel ?? "—"} · {formatDateTime(conv.linkedAt)}
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h5 className="flex items-center gap-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          {t("cases.activity.comments")}
          <span className="rounded-full bg-surface-2 px-1.5 text-[10px] tabular-nums">
            {c.comments.length}
          </span>
        </h5>
        {c.comments.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageCircle className="size-3.5" aria-hidden /> {t("cases.conversation.no-comments")}
          </p>
        ) : (
          <ul className="space-y-3">
            {c.comments.map((cm) => {
              const author = userLabel(cm.authorUserId);
              return (
                <li key={cm.id} className="flex gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                    {initials(author.split(/\s+/)[0], author.split(/\s+/)[1], author)}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="flex items-baseline gap-2 text-xs">
                      <span className="font-medium">{author}</span>
                      <span className="text-muted-foreground">{formatRelative(cm.createdAt)}</span>
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{formatCommentBody(cm.body)}</p>
                    <AttachmentChips attachments={cm.attachments} label={t("cases.activity.comment-files")} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim() && !comment.isPending) comment.mutate();
          }}
        >
          <label htmlFor={`conv-comment-${caseId}`} className="text-xs font-medium text-muted-foreground">
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
