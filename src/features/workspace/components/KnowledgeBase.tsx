import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  CornerDownLeft,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { IconTooltip } from "@/components/common/IconTooltip";
import { Button } from "@/components/ui/button";
import { useDeskSettings } from "@/core/agent-settings";
import { cn } from "@/shared/lib/utils";
import { searchKnowledgeBase, type KnowledgeBaseHit } from "../api";
import type { Conversation } from "../model/types";
import { composerKey, useComposerStore } from "../store/composerStore";
import { useKnowledgeStore } from "../store/knowledgeStore";

/** Answers longer than this read better in the full panel than in a card. */
const LONG_ANSWER = 320;
const NO_HITS: KnowledgeBaseHit[] = [];

/** True for a moment after `flash()`, to show "Copied" / "Added" on the button that was pressed. */
function useFlash(ms = 1600) {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [
    on,
    () => {
      setOn(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setOn(false), ms);
    },
  ] as const;
}

/** What the agent does with an answer: put it in the chat's composer, or copy it elsewhere. */
function AnswerActions({
  conversation,
  hit,
  size,
}: {
  conversation: Conversation;
  hit: KnowledgeBaseHit;
  size: "sm" | "lg";
}) {
  const { t } = useTranslation();
  const [added, flashAdded] = useFlash();
  const [copied, flashCopied] = useFlash();
  if (!hit.answer) return null;
  const big = size === "lg";
  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        size={big ? "default" : "xs"}
        className={cn("rounded-lg font-medium", big ? "h-9 flex-1" : "h-7")}
        onClick={() => {
          useComposerStore.getState().insertText(composerKey(conversation), hit.answer);
          flashAdded();
        }}
      >
        {added ? <Check aria-hidden /> : <CornerDownLeft aria-hidden />}
        {added
          ? t("chat-features.customer-info.knowledge-base.added")
          : t("chat-features.customer-info.knowledge-base.add-to-chat")}
      </Button>
      <Button
        type="button"
        size={big ? "default" : "xs"}
        variant="outline"
        className={cn("rounded-lg font-medium", big ? "h-9" : "h-7")}
        onClick={() => {
          void navigator.clipboard?.writeText(hit.answer).then(flashCopied, () => undefined);
        }}
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied
          ? t("chat-features.customer-info.knowledge-base.copied")
          : t("chat-features.customer-info.knowledge-base.copy")}
      </Button>
    </div>
  );
}

function SourceLinks({ hit, all }: { hit: KnowledgeBaseHit; all?: boolean }) {
  const { t } = useTranslation();
  const sources = hit.sources ?? [];
  if (!sources.length) return null;
  const shown = all ? sources : sources.slice(0, 2);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((source, index) => (
        <a
          key={`${source.url ?? source.title ?? index}`}
          href={source.url || undefined}
          target="_blank"
          rel="noreferrer"
          title={source.title || source.url}
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
        >
          <ExternalLink className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{source.title || source.url}</span>
        </a>
      ))}
      {!all && sources.length > shown.length && (
        <span className="text-[12px] text-muted-foreground">
          {t("chat-features.customer-info.knowledge-base.more-sources", {
            count: sources.length - shown.length,
          })}
        </span>
      )}
    </div>
  );
}

function AnswerCard({
  conversation,
  hit,
  roomy,
}: {
  conversation: Conversation;
  hit: KnowledgeBaseHit;
  roomy?: boolean;
}) {
  const { t } = useTranslation();
  const open = () => useKnowledgeStore.getState().expand(conversation.conversationId, hit.query);
  const long = hit.answer.length > LONG_ANSWER;
  return (
    <article className="space-y-2 rounded-xl border border-border/70 bg-surface p-3 shadow-2xs">
      <div className="flex items-start justify-between gap-2">
        <h5 className="min-w-0 text-[13px] leading-snug font-medium text-foreground">{hit.query}</h5>
        <IconTooltip label={t("chat-features.customer-info.knowledge-base.expand")}>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={t("chat-features.customer-info.knowledge-base.expand")}
            className="-me-1 -mt-0.5 size-6 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
            onClick={open}
          >
            <Maximize2 className="size-3.5" aria-hidden />
          </Button>
        </IconTooltip>
      </div>
      {hit.answer ? (
        <p
          className={cn(
            "text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/75",
            roomy ? "line-clamp-[9]" : "line-clamp-5",
          )}
        >
          {hit.answer}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          {t("chat-features.customer-info.knowledge-base.no-answer")}
        </p>
      )}
      {long && (
        <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={open}>
          {t("chat-features.customer-info.knowledge-base.read-full")}
        </button>
      )}
      <SourceLinks hit={hit} />
      <AnswerActions conversation={conversation} hit={hit} size="sm" />
    </article>
  );
}

/** Search box and the answers found so far, for the Customer Info panel. */
export function KnowledgeSearch({
  conversation,
  focus,
}: {
  conversation: Conversation;
  /** Fills the panel: the search box stays put and only the answers scroll. */
  focus?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const url = useDeskSettings()?.knowledgeBaseUrl ?? "";
  const id = conversation.conversationId;
  const hits = useKnowledgeStore((state) => state.hits[id] ?? NO_HITS);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const label = t("chat-features.customer-info.knowledge-base.placeholder");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const asked = query.trim();
    if (!asked || busy || !url) return;
    setBusy(true);
    // Whoever is searching the knowledge base is not looking at the customer: give it the panel.
    useKnowledgeStore.getState().setFocused(id, true);
    searchKnowledgeBase({ url, query: asked, language: i18n.language || "en" })
      .then((hit) => {
        useKnowledgeStore.getState().addHit(id, hit);
        setQuery("");
      })
      .catch((error: unknown) => toast.error(String(error)))
      .finally(() => setBusy(false));
  };

  return (
    <div className={cn(focus ? "flex h-full min-h-0 flex-col" : "space-y-3")}>
      <form
        onSubmit={submit}
        role="search"
        className={cn(focus && "shrink-0 border-b border-border/40 px-4 py-3")}
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={label}
            aria-label={label}
            disabled={!url}
            className="h-10 w-full rounded-xl border border-border/80 bg-surface ps-9 pe-11 text-sm shadow-2xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-60"
          />
          <Button
            type="submit"
            size="icon-xs"
            aria-label={t("chat-features.customer-info.knowledge-base.search")}
            disabled={busy || !query.trim() || !url}
            className="absolute end-1.5 top-1/2 size-7 -translate-y-1/2 rounded-lg"
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ArrowRight aria-hidden />}
          </Button>
        </div>
      </form>
      <div className={cn(focus ? "min-h-0 flex-1 space-y-3 overflow-auto px-4 py-4" : "contents")}>
        {busy && (
          <div className="space-y-2 rounded-xl border border-border/60 p-3" aria-hidden>
            <div className="h-3 w-2/5 animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-surface-2" />
          </div>
        )}
        {hits.length === 0 && !busy && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("chat-features.customer-info.knowledge-base.empty")}
          </p>
        )}
        {hits.map((hit) => (
          <AnswerCard key={hit.query} conversation={conversation} hit={hit} roomy={focus} />
        ))}
      </div>
    </div>
  );
}

/**
 * The knowledge base across the whole Customer Info panel, which a search switches to: the agent is reading
 * answers now, not the customer's details. One button hands the panel back.
 */
export function KnowledgeFocusView({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation();
  const id = conversation.conversationId;
  return (
    <div className="flex h-full min-h-0 flex-col bg-chat-panel-right">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/40 px-4 py-2.5">
        <h4 className="text-[13px] font-medium text-foreground/80">
          {t("chat-features.customer-info.knowledge-base.title")}
        </h4>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="-me-2 h-8 gap-1.5 rounded-lg px-2.5 text-muted-foreground hover:text-foreground"
          onClick={() => useKnowledgeStore.getState().setFocused(id, false)}
        >
          <Minimize2 className="size-4" aria-hidden />
          {t("chat-features.customer-info.knowledge-base.show-customer-info")}
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <KnowledgeSearch conversation={conversation} focus />
      </div>
    </div>
  );
}

/** One answer across the whole panel, for long ones: read it, switch to another search, or send it. */
export function KnowledgeFullView({ conversation, query }: { conversation: Conversation; query: string }) {
  const { t } = useTranslation();
  const id = conversation.conversationId;
  const hits = useKnowledgeStore((state) => state.hits[id] ?? NO_HITS);
  const hit = hits.find((row) => row.query === query);
  const others = hits.filter((row) => row.query !== query);
  const close = () => useKnowledgeStore.getState().expand(id, null);
  if (!hit) return null;
  return (
    <div className="flex h-full min-h-0 flex-col bg-chat-panel-right">
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="-ms-1 h-8 gap-1.5 rounded-lg px-2 text-muted-foreground hover:text-foreground"
          onClick={close}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("chat-features.customer-info.knowledge-base.back")}
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-4">
        <h3 className="text-[14px] leading-snug font-medium text-foreground">{hit.query}</h3>
        {hit.answer ? (
          <p className="text-sm leading-6 whitespace-pre-wrap text-foreground/85">{hit.answer}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {t("chat-features.customer-info.knowledge-base.no-answer")}
          </p>
        )}
        {(hit.sources?.length ?? 0) > 0 && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <h4 className="text-xs font-medium text-muted-foreground">
              {t("chat-features.customer-info.knowledge-base.sources")}
            </h4>
            <SourceLinks hit={hit} all />
          </div>
        )}
        {others.length > 0 && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <h4 className="text-xs font-medium text-muted-foreground">
              {t("chat-features.customer-info.knowledge-base.other-searches")}
            </h4>
            <ul className="space-y-1">
              {others.map((row) => (
                <li key={row.query}>
                  <button
                    type="button"
                    className="w-full truncate rounded-lg px-2 py-1.5 text-start text-[13px] text-foreground/80 transition-colors hover:bg-surface-2"
                    onClick={() => useKnowledgeStore.getState().expand(id, row.query)}
                  >
                    {row.query}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {hit.answer && (
        <div className="border-t border-border/40 bg-chat-panel-right-card px-4 py-3">
          <AnswerActions conversation={conversation} hit={hit} size="lg" />
        </div>
      )}
    </div>
  );
}
