import { Loader2 } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatDateTime, formatRelative } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import type { CaseAuditEntry, CaseComment } from "../api";
import {
  formatHistorySummary,
  historyTimelineDot,
  type SummaryTone,
  type TimelineDot,
} from "../model/activityFormat";
import { formatCommentBody, truncate } from "../model/format";
import { AttachmentChips } from "./Attachments";

export type ActivityTab = "all" | "comments" | "history";

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
  muted: "text-foreground/70",
  emphasis: "font-medium text-foreground",
  from: "text-foreground/70 line-through decoration-muted-foreground/50",
  to: "font-medium text-primary",
  warn: "font-medium text-destructive-text",
};

const byNewest = (a: Row, b: Row) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/** All / Comments / History tab strip shared by the Workbench pane and the conversation tab. */
export function ActivityTabs({ tab, onTab }: { tab: ActivityTab; onTab: (tab: ActivityTab) => void }) {
  const { t } = useTranslation();
  const tabs: { id: ActivityTab; label: string }[] = [
    { id: "all", label: t("cases.activity.all") },
    { id: "comments", label: t("cases.activity.comments") },
    { id: "history", label: t("cases.activity.history") },
  ];
  return (
    <div
      role="tablist"
      aria-label={t("cases.activity.label")}
      className="inline-flex gap-0.5 rounded-lg bg-surface-2 p-0.5"
    >
      {tabs.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={tab === item.id}
          onClick={() => onTab(item.id)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            tab === item.id
              ? "bg-surface text-foreground shadow-xs"
              : "text-foreground/70 hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** Comments and readable history on one newest-first timeline. */
export function ActivityTimeline({
  tab,
  comments,
  history,
  historyLoading,
  historyLimited,
  userLabel,
  commentActions,
}: {
  tab: ActivityTab;
  comments: CaseComment[];
  history: CaseAuditEntry[];
  historyLoading: boolean;
  /** Only case milestones are shown (the full audit log is not readable for this agent). */
  historyLimited?: boolean;
  userLabel: (userId: string) => string;
  commentActions?: (comment: CaseComment) => ReactNode;
}) {
  const { t } = useTranslation();
  const rows = useMemo(() => {
    const commentRows: Row[] = comments.map((c) => ({
      id: `comment-${c.id}`,
      kind: "comment",
      createdAt: c.createdAt,
      comment: c,
    }));
    const historyRows: Row[] = history.map((h) => ({
      id: `history-${h.id}`,
      kind: "history",
      createdAt: h.createdAt,
      history: h,
    }));
    if (tab === "comments") return commentRows.sort(byNewest);
    if (tab === "history") return historyRows.sort(byNewest);
    return [...commentRows, ...historyRows].sort(byNewest);
  }, [comments, history, tab]);

  if (historyLoading && tab !== "comments") {
    return (
      <p className="flex items-center gap-2 py-4 text-sm text-foreground/70">
        <Loader2 className="size-4 animate-spin" /> {t("cases.loading")}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {historyLimited && tab !== "comments" && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground/70">
          {t("cases.activity.milestones-only")}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-foreground/70">
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
                  {actor && <span className="font-medium text-foreground">{userLabel(actor)}</span>}
                  {row.kind === "comment" && (
                    <span className="text-foreground/70">{t("cases.activity.internal-note")}</span>
                  )}
                  <time
                    className="text-foreground/70"
                    dateTime={row.createdAt}
                    title={formatDateTime(row.createdAt)}
                  >
                    {formatRelative(row.createdAt)}
                  </time>
                </div>
                {row.kind === "history" ? (
                  <p className="mt-0.5 text-sm text-foreground">
                    {formatHistorySummary(row.history, userLabel, t).map((seg, i) => (
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
                    {commentActions?.(row.comment)}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
