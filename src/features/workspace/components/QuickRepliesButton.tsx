import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SearchField } from "@/components/common/ListChrome";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useFeature } from "@/config/featureFlags";
import { useCurrentUser } from "@/core/auth";
import { loadQuickReplies, saveQuickReplies, type QuickReply } from "../api";

/** Inserts a saved quick reply and lets the agent create, edit, or delete replies. */
export function QuickRepliesButton({
  disabled,
  onPick,
}: {
  disabled?: boolean;
  onPick: (message: string) => void;
}) {
  const { t } = useTranslation();
  const enabled = useFeature("quickReplies");
  const user = useCurrentUser();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<QuickReply | null>(null);
  const query = useQuery({
    queryKey: ["quick-replies", user?.id],
    enabled: enabled && (open || manage) && Boolean(user?.id),
    queryFn: () => loadQuickReplies(user!.id),
  });
  const term = search.trim().toLowerCase();
  const replies = (query.data?.replies ?? []).filter(
    (reply) =>
      !term ||
      reply.message.toLowerCase().includes(term) ||
      reply.tags.some((tag) => tag.toLowerCase().includes(term)),
  );

  const persist = async (next: QuickReply[]) => {
    if (!user) return;
    await saveQuickReplies(user.id, query.data?.id ?? null, next);
    await client.invalidateQueries({ queryKey: ["quick-replies", user.id] });
  };

  if (!enabled) return null;
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            disabled={disabled}
            aria-label={t("quick-replies.title")}
          >
            <Zap className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-2">
          <div className="flex items-center gap-2">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t("quick-replies.search-placeholder")}
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label={t("app-header.manage-quick-replies")}
              onClick={() => {
                setOpen(false);
                setManage(true);
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
          <ul className="mt-2 max-h-64 space-y-1 overflow-auto">
            {replies.map((reply) => (
              <li key={reply.id}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-start hover:bg-muted"
                  onClick={() => {
                    onPick(reply.message);
                    setOpen(false);
                  }}
                >
                  <span className="line-clamp-2 text-sm">{reply.message}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {reply.tags.join(", ")}
                  </span>
                </button>
              </li>
            ))}
            {!query.isLoading && replies.length === 0 && (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                {t("quick-replies.no-results")}
              </li>
            )}
          </ul>
        </PopoverContent>
      </Popover>

      <Dialog open={manage} onOpenChange={setManage}>
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
            {(query.data?.replies ?? []).map((reply) => (
              <li key={reply.id} className="rounded-lg border px-3 py-2">
                <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{reply.tags.join(", ")}</p>
                <div className="mt-2 flex gap-1">
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => setDraft(reply)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      void persist((query.data?.replies ?? []).filter((item) => item.id !== reply.id))
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
              {draft && (query.data?.replies ?? []).some((r) => r.id === draft.id)
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
                const existing = query.data?.replies ?? [];
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
