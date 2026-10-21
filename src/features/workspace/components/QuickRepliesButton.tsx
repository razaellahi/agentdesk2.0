import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { IconTooltip } from "@/components/common/IconTooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFeature } from "@/config/featureFlags";
import { useCurrentUser } from "@/core/auth";
import { cn } from "@/shared/lib/utils";
import { saveQuickReplies, type QuickReply } from "../api";
import { useQuickReplies } from "../hooks/useQuickReplies";

/** The lightning button of the reply box: opens and closes the quick replies panel. */
export function QuickRepliesButton({
  open,
  disabled,
  onToggle,
}: {
  open: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const enabled = useFeature("quickReplies");
  if (!enabled) return null;
  return (
    <IconTooltip label={t("quick-replies.title")}>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(
          "size-7 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground",
          open && "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary",
        )}
        disabled={disabled}
        aria-label={t("quick-replies.title")}
        aria-pressed={open}
        onClick={onToggle}
      >
        <Zap className="size-3.5" aria-hidden />
      </Button>
    </IconTooltip>
  );
}

/** Create, edit and delete quick replies. */
export function QuickRepliesManager({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const client = useQueryClient();
  const [draft, setDraft] = useState<QuickReply | null>(null);
  const { replies, id } = useQuickReplies(open);

  const persist = async (next: QuickReply[]) => {
    if (!user) return;
    await saveQuickReplies(user.id, id, next);
    await client.invalidateQueries({ queryKey: ["quick-replies", user.id] });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("app-header.manage-quick-replies")}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() => setDraft({ id: crypto.randomUUID(), message: "", tags: [] })}
            >
              <Plus className="size-4" />
              {t("quick-replies.create")}
            </Button>
          </div>
          <ul className="max-h-72 space-y-2 overflow-auto">
            {replies.map((reply) => (
              <li key={reply.id} className="rounded-lg border px-3 py-2">
                <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">{reply.tags.join(", ")}</p>
                <div className="mt-2 flex gap-1">
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => setDraft(reply)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      void persist(replies.filter((item) => item.id !== reply.id))
                        .then(() => toast.success(t("snackbar.Quick-Replies-Saved-Successfully")))
                        .catch((error: unknown) => toast.error(String(error)));
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(draft)} onOpenChange={(next) => !next && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {draft && replies.some((r) => r.id === draft.id)
                ? t("quick-replies.edit")
                : t("quick-replies.create")}
            </DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="grid gap-3">
              <Textarea
                value={draft.message}
                onChange={(event) => setDraft({ ...draft, message: event.target.value })}
                rows={4}
                placeholder={t("quick-replies.message-placeholder")}
              />
              <Input
                value={draft.tags.join(", ")}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    tags: event.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={t("quick-replies.tags-placeholder")}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              {t("labels.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!draft?.message.trim()}
              onClick={() => {
                if (!draft) return;
                const existing = replies;
                const next = existing.some((item) => item.id === draft.id)
                  ? existing.map((item) => (item.id === draft.id ? draft : item))
                  : [...existing, draft];
                void persist(next)
                  .then(() => {
                    setDraft(null);
                    toast.success(t("snackbar.Quick-Replies-Saved-Successfully"));
                  })
                  .catch((error: unknown) => toast.error(String(error)));
              }}
            >
              {t("quick-replies.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
