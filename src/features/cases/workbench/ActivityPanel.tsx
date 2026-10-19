import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Paperclip } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatRelative } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import {
  ATTACHMENT_ACCEPT,
  caseKeys,
  deleteComment,
  fetchAllowedTransitions,
  fetchCaseAuditLog,
  updateCase,
  type Case,
  type CaseAuditEntry,
  type CaseComment,
} from "../api";
import { AttachmentChips } from "../components/Attachments";
import { PendingUploadList } from "../components/AttachmentUpload";
import { useAttachmentUploads } from "../hooks/useAttachmentUploads";
import { MentionComposer, type MentionComposerHandle } from "../components/MentionComposer";
import {
  formatHistorySummary,
  historyTimelineDot,
  isVisibleHistoryEntry,
  type SummaryTone,
  type TimelineDot,
} from "../model/activityFormat";
import { formatCommentBody, truncate } from "../model/format";
import type { CaseAbilities } from "../model/workbench";
import { useUserLabel } from "../hooks/useDisplayNames";

type Tab = "all" | "comments" | "history";

type Row =
  | { id: string; kind: "comment"; createdAt: string; comment: CaseComment }
  | { id: string; kind: "history"; createdAt: string; history: CaseAuditEntry };

const DOT: Record<TimelineDot, string> = {
  system: "bg-muted-foreground/40",
  user: "bg-primary",
  status: "bg-warning",
  success: "bg-success",
  warning: "bg-destructive",
  muted: "bg-border-strong",
};

const TONE: Record<SummaryTone, string> = {
  plain: "",
  muted: "text-muted-foreground",
  emphasis: "font-medium text-foreground",
  from: "text-muted-foreground line-through decoration-muted-foreground/50",
  to: "font-medium text-primary",
  warn: "font-medium text-destructive-text",
};

const byNewest = (a: Row, b: Row) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/**
 * Case activity: comments + readable history, and the compose box that posts a note
 * and/or moves the case to an allowed status (updateCase), as in the source pane.
 */
export function ActivityPanel({
  record,
  currentUserId,
  abilities,
  onChanged,
}: {
  record: Case;
  currentUserId: string | null;
  abilities: CaseAbilities;
  onChanged: (updated: Case) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [body, setBody] = useState("");
  const [statusId, setStatusId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const composer = useRef<MentionComposerHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploads = useAttachmentUploads();

  const history = useQuery({
    queryKey: caseKeys.audit(record.id),
    queryFn: () => fetchCaseAuditLog(record.id),
  });
  const transitions = useQuery({
    queryKey: caseKeys.transitions(record.id),
    queryFn: () => fetchAllowedTransitions(record.id),
  });
  const allowed = transitions.data ?? [];
  // The first allowed status is the current one; the agent picks a target from the rest.
  const current = allowed[0];
  const selected = allowed.find((s) => s.id === statusId) ?? current;

  const authors = [
    ...record.comments.map((c) => c.authorUserId),
    ...(history.data ?? []).map((h) => h.performedBy),
  ];
  const userLabel = useUserLabel(currentUserId, authors);

  const rows = useMemo(() => {
    const comments: Row[] = record.comments.map((c) => ({
      id: `comment-${c.id}`,
      kind: "comment",
      createdAt: c.createdAt,
      comment: c,
    }));
    const entries: Row[] = (history.data ?? []).filter(isVisibleHistoryEntry).map((h) => ({
      id: `history-${h.id}`,
      kind: "history",
      createdAt: h.createdAt,
      history: h,
    }));
    if (tab === "comments") return comments.sort(byNewest);
    if (tab === "history") return entries.sort(byNewest);
    return [...comments, ...entries].sort(byNewest);
  }, [record.comments, history.data, tab]);

  const afterChange = (updated: Case) => {
    onChanged(updated);
    void queryClient.invalidateQueries({ queryKey: caseKeys.audit(record.id) });
    void queryClient.invalidateQueries({ queryKey: caseKeys.transitions(record.id) });
  };

  const submit = useMutation({
    mutationFn: () =>
      updateCase({
        caseId: record.id,
        targetStatusId: selected!.id,
        ...(body.trim() ? { commentBody: body.trim() } : {}),
        ...(uploads.refs.length ? { attachments: uploads.refs } : {}),
      }),
    onMutate: () => setError(null),
    onSuccess: (updated) => {
      afterChange(updated);
      composer.current?.clear();
      uploads.reset();
      setStatusId(null);
    },
    onError: (cause: Error) => setError(cause.message || t("cases.activity.update-failed")),
  });

  const remove = useMutation({
    mutationFn: deleteComment,
    onMutate: () => setError(null),
    onSuccess: afterChange,
    onError: (cause: Error) => setError(cause.message || t("cases.activity.delete-failed")),
  });

  const busy = submit.isPending || remove.isPending;
  const statusChanging = Boolean(selected && current && selected.id !== current.id);
  const hasComment = Boolean(body.trim());
  const canSubmit =
    Boolean(selected && current) &&
    !uploads.uploading &&
    !uploads.failed &&
    (statusChanging || hasComment || uploads.refs.length > 0) &&
    // Moving to a pending status needs a note telling the customer/team why.
    !(statusChanging && selected?.statusCategory === "PENDING" && !hasComment);

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: t("cases.activity.all") },
    { id: "comments", label: t("cases.activity.comments") },
    { id: "history", label: t("cases.activity.history") },
  ];

  return (
    <section aria-label={t("cases.activity.label")} className="flex min-h-0 flex-col">
      <div role="tablist" className="flex gap-1 border-b border-border px-4">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "-mb-px border-b-2 px-2 py-2 text-xs font-medium",
              tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="mx-4 mt-3 rounded-lg bg-destructive-soft px-3 py-2 text-xs text-destructive-text"
        >
          {error}
        </p>
      )}
      <div className="px-4 py-3">
        {history.isPending && tab !== "comments" ? (
          <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("cases.loading")}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {tab === "comments"
              ? t("cases.activity.no-comments")
              : tab === "history"
                ? t("cases.activity.no-history")
                : t("cases.activity.empty")}
          </p>
        ) : (
          <ol className="relative space-y-4 border-s border-border ps-4">
            {rows.map((row) => {
              const actor = row.kind === "comment" ? row.comment.authorUserId : row.history.performedBy;
              const dot = row.kind === "comment" ? "user" : historyTimelineDot(row.history);
              return (
                <li key={row.id} className="relative">
                  <span
                    className={cn(
                      "absolute -start-[21px] top-1.5 size-2.5 rounded-full ring-2 ring-surface",
                      DOT[dot],
                    )}
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span className="font-medium text-foreground">{userLabel(actor)}</span>
                    {row.kind === "comment" && (
                      <span className="text-muted-foreground">{t("cases.activity.internal-note")}</span>
                    )}
                    <time
                      className="text-muted-foreground"
                      dateTime={row.createdAt}
                      title={formatDateTime(row.createdAt)}
                    >
                      {formatRelative(row.createdAt)}
                    </time>
                  </div>
                  {row.kind === "history" ? (
                    <p className="mt-0.5 text-sm text-foreground">
                      {formatHistorySummary(row.history, (id) => userLabel(id), t).map((seg, i) => (
                        <span key={i} className={TONE[seg.tone ?? "plain"]}>
                          {seg.text}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <div className="mt-0.5 space-y-1.5">
                      <p className="text-sm whitespace-pre-wrap text-foreground">
                        {tab === "comments"
                          ? formatCommentBody(row.comment.body)
                          : truncate(formatCommentBody(row.comment.body))}
                      </p>
                      <AttachmentChips
                        attachments={row.comment.attachments}
                        label={t("cases.activity.comment-files")}
                      />
                      {abilities.deleteComment(row.comment.authorUserId) && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-destructive-text"
                          disabled={busy}
                          onClick={() => remove.mutate(row.comment.id)}
                        >
                          {t("cases.activity.delete")}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <form
        className="sticky bottom-0 mt-auto space-y-2 border-t border-border bg-surface px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit && !busy) submit.mutate();
        }}
      >
        <label htmlFor={`case-compose-${record.id}`} className="text-xs font-medium text-muted-foreground">
          {t("cases.activity.update-case")}
        </label>
        <MentionComposer
          ref={composer}
          id={`case-compose-${record.id}`}
          placeholder={t("cases.activity.placeholder")}
          disabled={busy}
          onChange={setBody}
        />
        <PendingUploadList files={uploads.files} onRemove={uploads.remove} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip />
            {t("cases.activity.attach")}
          </Button>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            accept={ATTACHMENT_ACCEPT}
            onChange={(event) => {
              if (event.target.files?.length) uploads.add(event.target.files, { caseId: record.id });
              event.target.value = "";
            }}
          />
          <select
            className="ms-auto h-8 rounded-lg border border-border bg-surface px-2 text-xs"
            aria-label={t("cases.activity.submit-as-status")}
            disabled={busy || allowed.length === 0}
            value={selected?.id ?? ""}
            onChange={(event) => setStatusId(event.target.value)}
          >
            {allowed.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={busy || !canSubmit}>
            {submit.isPending && <Loader2 className="animate-spin" />}
            {t("cases.activity.submit-as", { status: selected?.label ?? "…" })}
          </Button>
        </div>
      </form>
    </section>
  );
}
