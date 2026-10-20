import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Paperclip } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  ATTACHMENT_ACCEPT,
  caseKeys,
  deleteComment,
  fetchAllowedTransitions,
  updateCase,
  type Case,
} from "../api";
import { ActivityTabs, ActivityTimeline, type ActivityTab } from "../components/ActivityTimeline";
import { PendingUploadList } from "../components/AttachmentUpload";
import { NativeSelect } from "../components/Fields";
import { MentionComposer, type MentionComposerHandle } from "../components/MentionComposer";
import { useAttachmentUploads } from "../hooks/useAttachmentUploads";
import { useCaseHistory } from "../hooks/useCaseHistory";
import { useUserLabel } from "../hooks/useDisplayNames";
import type { CaseAbilities } from "../model/workbench";

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
  const [tab, setTab] = useState<ActivityTab>("all");
  const [body, setBody] = useState("");
  const [statusId, setStatusId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const composer = useRef<MentionComposerHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploads = useAttachmentUploads();

  const history = useCaseHistory(record);
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
    ...history.entries.map((h) => h.performedBy),
  ];
  const userLabel = useUserLabel(currentUserId, authors);

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

  return (
    <section aria-label={t("cases.activity.label")} className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pt-3">
        <ActivityTabs tab={tab} onTab={setTab} />
      </div>
      {error && (
        <p
          role="alert"
          className="mx-5 mt-3 rounded-lg bg-destructive-soft px-3 py-2 text-xs text-destructive-text"
        >
          {error}
        </p>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <ActivityTimeline
          tab={tab}
          comments={record.comments}
          history={history.entries}
          historyLoading={history.loading}
          historyLimited={history.limited}
          userLabel={userLabel}
          commentActions={(comment) =>
            abilities.deleteComment(comment.authorUserId) && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive-text"
                disabled={busy}
                onClick={() => remove.mutate(comment.id)}
              >
                {t("cases.activity.delete")}
              </button>
            )
          }
        />
      </div>
      <form
        className="space-y-2.5 border-t border-border bg-surface px-5 py-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit && !busy) submit.mutate();
        }}
      >
        <label htmlFor={`case-compose-${record.id}`} className="sr-only">
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
          <NativeSelect
            className="ms-auto"
            selectClassName="h-8 text-xs"
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
          </NativeSelect>
          <Button type="submit" size="sm" disabled={busy || !canSubmit}>
            {submit.isPending && <Loader2 className="animate-spin" />}
            {t("cases.activity.submit-as", { status: selected?.label ?? "…" })}
          </Button>
        </div>
      </form>
    </section>
  );
}
