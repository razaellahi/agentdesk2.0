import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, Radio, User, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SearchField } from "@/components/common/ListChrome";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser, usePermission } from "@/core/auth";
import { socketManager } from "@/core/realtime";
import { cn } from "@/shared/lib/utils";
import {
  requestAssistance,
  searchAssistance,
  type AssistAction,
  type AssistTarget,
} from "../session/assistance";
import type { Conversation } from "../model/types";
import { useLiveCall, useVoiceStacks } from "../hooks/useLiveCall";

const ACTIONS: AssistAction[] = ["transfer", "consult", "conference"];

export function AssistDialog({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const call = useLiveCall();
  const stacks = useVoiceStacks();
  const allowed = {
    transfer: usePermission("directTransfer"),
    consult: usePermission("consult"),
    conference: usePermission("conference"),
  };
  const [requestedAction, setAction] = useState<AssistAction>("transfer");
  const action = allowed[requestedAction]
    ? requestedAction
    : (ACTIONS.find((a) => allowed[a]) ?? requestedAction);
  const [mode, setMode] = useState<"agent" | "queue">("agent");
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [picked, setPicked] = useState<AssistTarget | null>(null);
  const [note, setNote] = useState("");
  const targetMode = action === "conference" ? "queue" : mode;

  const query = useQuery({
    queryKey: ["assistance", targetMode, applied, conversation.conversationId],
    enabled: Boolean(user?.id),
    queryFn: () =>
      searchAssistance(
        targetMode === "agent" ? "AGENT" : "QUEUE",
        applied,
        conversation.conversationId,
        user!.id,
      ),
  });

  const title =
    action === "consult"
      ? t(
          targetMode === "queue"
            ? "chat-features.interactions.Queue-Consult"
            : "chat-features.interactions.Agent-Consult",
        )
      : action === "conference"
        ? t("chat-features.interactions.Conference")
        : t(
            targetMode === "queue"
              ? "chat-features.interactions.Transfer-To-Queue"
              : "chat-features.interactions.Transfer-To-Agent",
          );

  const send = () => {
    if (!socketManager.connected) {
      toast.error(t("snackbar.Unable-to-send-the-message-at-the-moment"));
      return;
    }
    const sent = requestAssistance(
      conversation,
      action,
      targetMode === "agent"
        ? { mode: "agent", agentId: picked?.id }
        : { mode: "queue", queueName: picked?.queueName },
      note.trim(),
      call,
      stacks,
    );
    if (!sent) return;
    // Transfers and conferences are confirmed by the server (agentAssistanceRequestPlaced).
    if (action === "consult") toast.success(t("snackbar.Consult-request-placed-successfully"));
    onClose();
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" size="lg" className="gap-0 p-0">
        <SheetHeader className="border-b border-border/50 bg-muted/20 px-6 py-4">
          <SheetTitle className="text-base font-bold">{title}</SheetTitle>
          <SheetDescription>{t("chat-features.interactions.agent-assistance")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-muted/40 p-1">
            {ACTIONS.filter((item) => allowed[item]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setAction(item);
                  setPicked(null);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  action === item
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                {item === "transfer" && <ArrowRightLeft className="size-3.5" />}
                {item === "consult" && <User className="size-3.5" />}
                {item === "conference" && <Users className="size-3.5" />}
                <span>
                  {t(
                    `chat-features.interactions.${item === "transfer" ? "Transfer" : item === "consult" ? "Consult" : "Conference"}`,
                  )}
                </span>
              </button>
            ))}
            {action !== "conference" && (
              <button
                type="button"
                className="ms-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
                onClick={() => {
                  setMode((current) => (current === "agent" ? "queue" : "agent"));
                  setPicked(null);
                }}
              >
                <Radio className="size-3" />
                <span>
                  Switch to {targetMode === "agent" ? t("supervisor.queue") : t("supervisor.agent")}
                </span>
              </button>
            )}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setApplied(search.trim());
              setPicked(null);
            }}
          >
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t("chat-features.interactions.Search-Queue")}
              className="flex-1"
            />
            <Button type="submit" variant="outline" className="h-9 rounded-xl font-medium">
              {t("labels.search")}
            </Button>
          </form>
          <ul className="min-h-0 flex-1 space-y-1.5 overflow-auto">
            {(query.data ?? []).map((item, index) => {
              const label =
                targetMode === "queue"
                  ? item.queueName
                  : item.username || [item.firstName, item.lastName].filter(Boolean).join(" ");
              const selected = picked === item;
              return (
                <li
                  key={item.id ?? item.queueId ?? label}
                  className="desk-msg-in"
                  style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => setPicked(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-start text-sm transition-all",
                      selected
                        ? "border-primary bg-primary-soft/60 shadow-xs ring-1 ring-primary/30"
                        : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40",
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-xs font-bold text-primary shadow-2xs">
                      {targetMode === "queue" ? <Users className="size-4" /> : <User className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground">{label}</span>
                      {targetMode === "agent" && item.queueName && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{item.queueName}</span>
                      )}
                    </div>
                    {selected && <span className="size-2 rounded-full bg-primary ring-4 ring-primary/20" />}
                  </button>
                </li>
              );
            })}
            {!query.isLoading && (query.data ?? []).length === 0 && (
              <li className="px-1 py-10 text-center text-sm text-muted-foreground">
                {t("globals.no-data-available")}
              </li>
            )}
          </ul>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("chat-features.interactions.notes")}
            rows={3}
            className="rounded-xl"
          />
        </SheetBody>
        <SheetFooter className="border-t border-border/50 bg-muted/10 px-6 py-3">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
            {t("labels.cancel")}
          </Button>
          <Button
            type="button"
            className="rounded-xl font-semibold shadow-xs"
            disabled={!picked || !allowed[action]}
            onClick={send}
          >
            {t(
              action === "consult"
                ? "chat-features.interactions.Consult-Request"
                : action === "conference"
                  ? "chat-features.interactions.Conference-Request"
                  : "chat-features.interactions.Transfer",
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
