import { ExternalLink, FileText, MessageSquareText, MessagesSquare, Radio } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/core/auth";
import { formatDateTime } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import type { LinkedConversation } from "../api";
import { conversationAtUrl, transcriptUrl } from "../model/links";

const SUMMARY_COLLAPSE_AT = 160;

function Summary({ conv }: { conv: LinkedConversation }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const long = (conv.summary?.length ?? 0) > SUMMARY_COLLAPSE_AT;
  return (
    <div className="border-t border-border bg-surface px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
        <FileText className="size-3.5" aria-hidden />
        {t("cases.detail.ai-summary")}
        {conv.summaryAt && <span className="font-normal">· {formatDateTime(conv.summaryAt)}</span>}
      </p>
      <p
        className={cn(
          "mt-1.5 text-sm leading-relaxed whitespace-pre-wrap",
          long && !expanded && "line-clamp-3",
        )}
      >
        {conv.summary}
      </p>
      {long && (
        <button
          type="button"
          className="mt-1 text-xs text-primary hover:underline"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t("cases.detail.show-less") : t("cases.detail.show-more")}
        </button>
      )}
    </div>
  );
}

/** Conversations linked to a case, each with its EFCX AI summary when one was pushed. */
export function LinkedConversations({
  conversations,
  fallbackName,
  currentInteractionId,
  customerProfileId,
}: {
  conversations: LinkedConversation[];
  /** Customer name for rows that did not record one. */
  fallbackName: string;
  /** The conversation the agent is in, highlighted. */
  currentInteractionId?: string | null;
  /** The case's customer; lets each row open their conversation in the desk at the link point. */
  customerProfileId?: string | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasAccess = usePermission("conversations");
  const canOpen = hasAccess && Boolean(customerProfileId);
  // The button always shows, so an agent can see why it is off instead of wondering where it went.
  const openHint = !hasAccess
    ? t("cases.detail.open-conversation-no-access")
    : !customerProfileId
      ? t("cases.detail.open-conversation-no-customer")
      : t("cases.detail.open-conversation-hint");
  return (
    <ul className="space-y-2">
      {conversations.map((conv) => {
        const current = Boolean(currentInteractionId) && conv.interactionId === currentInteractionId;
        return (
          <li
            key={conv.id}
            className={cn(
              "overflow-hidden rounded-xl border",
              current ? "border-primary/40" : "border-border",
            )}
          >
            <div className="flex items-stretch border border-border">
              <a
                href={transcriptUrl(conv.interactionId)}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 flex-1 items-start gap-2.5 px-3.5 py-2.5 text-sm hover:bg-surface"
              >
                {current ? (
                  <Radio className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                ) : (
                  <MessagesSquare className="mt-0.5 size-3.5 shrink-0 text-foreground/70" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {conv.customerName ?? fallbackName} · {conv.agentName ?? "—"}
                  </span>
                  <span className="block truncate text-xs text-foreground/70">
                    {conv.channel ?? "—"} · {formatDateTime(conv.linkedAt)}
                    {conv.interactionId && ` · ${conv.interactionId}`}
                  </span>
                </span>
                <ExternalLink className="mt-1 size-3 shrink-0 text-foreground/70" aria-hidden />
              </a>
              <span title={openHint} className="flex">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-24 shrink-0 flex-col gap-1 rounded-none border-s border-border px-2 py-2 text-center text-[12px] leading-tight font-medium whitespace-normal text-primary hover:bg-primary-soft disabled:text-muted-foreground disabled:opacity-60"
                  disabled={!canOpen}
                  aria-label={t("cases.detail.open-conversation")}
                  onClick={() =>
                    void navigate(
                      conversationAtUrl(customerProfileId!, conv.customerName ?? fallbackName, conv.linkedAt),
                    )
                  }
                >
                  <MessageSquareText className="size-4" aria-hidden />
                  {t("cases.detail.open-conversation")}
                </Button>
              </span>
            </div>
            {conv.summary && <Summary conv={conv} />}
          </li>
        );
      })}
    </ul>
  );
}
