import { CornerDownLeft, Pencil, Search, Send, X, Zap } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { IconTooltip } from "@/components/common/IconTooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";
import type { QuickReply } from "../api";
import { highlightParts, topTags } from "../model/quickReplies";

function Marked({ text, term }: { text: string; term: string }) {
  return (
    <>
      {highlightParts(text, term).map((part, index) =>
        part.match ? (
          <mark key={index} className="rounded-[3px] bg-primary/15 px-px text-inherit">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-border bg-surface-2 px-1 py-px font-sans text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

/**
 * The agent's quick replies above the reply box, opened by typing "/" or by the lightning button (as in
 * unified-agent). Typing narrows them by tag or message and the tag chips narrow them further; each reply is
 * inserted where the "/" was, or sent as it is. In "slash" mode the text after the "/" is the search and the
 * box keeps the focus (the parent steers the list with the arrow keys); in "browse" mode it has its own search.
 */
export function QuickRepliesPanel({
  mode,
  replies,
  matches,
  loading,
  term,
  onTerm,
  tag,
  onTag,
  active,
  onActive,
  onInsert,
  onSend,
  onManage,
  onClose,
}: {
  mode: "slash" | "browse";
  /** Everything the agent has saved (the chips come from it). */
  replies: QuickReply[];
  /** The replies to list: what fits `term` and `tag`. */
  matches: QuickReply[];
  loading: boolean;
  term: string;
  onTerm: (term: string) => void;
  tag: string | null;
  onTag: (tag: string | null) => void;
  active: number;
  onActive: (index: number) => void;
  onInsert: (reply: QuickReply) => void;
  /** Absent where a reply cannot be sent straight away (an email is written first). */
  onSend?: (reply: QuickReply) => void;
  onManage: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const list = useRef<HTMLUListElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const tags = topTags(replies);

  // Opening the list from the button puts the cursor in its search.
  useEffect(() => {
    if (mode === "browse") search.current?.focus();
  }, [mode]);

  // The reply the arrow keys are on stays in view.
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, matches]);

  const steer = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (matches.length)
        onActive((active + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
    } else if (event.key === "Enter" && matches[active]) {
      event.preventDefault();
      onInsert(matches[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    // Clicking in the list must not take the cursor out of the message box (or out of the list's own search).
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (!(event.target as HTMLElement).closest("input")) event.preventDefault();
      }}
    >
      <div
        className="@container mb-2 animate-in overflow-hidden rounded-xl border border-border bg-surface shadow-lift duration-150 fade-in-0 slide-in-from-bottom-1"
        role="region"
        aria-label={t("quick-replies.title")}
      >
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <Zap className="size-3.5" aria-hidden />
          </span>
          <p className="text-[13px] font-medium">{t("quick-replies.title")}</p>
          {mode === "slash" && (
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] text-muted-foreground">
              /{term}
            </span>
          )}
          <span className="ms-auto hidden items-center gap-2.5 text-[12px] text-muted-foreground @md:flex">
            <span className="flex items-center gap-1">
              <Key>↑↓</Key>
              {t("quick-replies.keys-navigate")}
            </span>
            <span className="flex items-center gap-1">
              <Key>↵</Key>
              {t("quick-replies.keys-insert")}
            </span>
            <span className="flex items-center gap-1">
              <Key>esc</Key>
              {t("quick-replies.keys-close")}
            </span>
          </span>
          <IconTooltip label={t("app-header.manage-quick-replies")}>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="size-6 rounded-md text-muted-foreground"
              aria-label={t("app-header.manage-quick-replies")}
              onClick={onManage}
            >
              <Pencil className="size-3.5" aria-hidden />
            </Button>
          </IconTooltip>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="size-6 rounded-md text-muted-foreground"
            aria-label={t("quick-replies.close")}
            onClick={onClose}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        </div>

        {mode === "browse" && (
          <div className="relative px-3 pb-2">
            <Search
              className="pointer-events-none absolute start-5.5 top-1/2 size-3.5 -translate-y-[calc(50%+4px)] text-muted-foreground"
              aria-hidden
            />
            <input
              ref={search}
              value={term}
              onChange={(event) => {
                onTerm(event.target.value);
                onActive(0);
              }}
              onKeyDown={steer}
              placeholder={t("quick-replies.search-placeholder")}
              aria-label={t("quick-replies.search-placeholder")}
              className="h-8 w-full rounded-lg border border-border bg-surface-2/50 ps-8 pe-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15"
            />
          </div>
        )}

        {tags.length > 0 && (
          <div
            className="flex scrollbar-none gap-1.5 overflow-x-auto px-3 pb-2"
            role="group"
            aria-label={t("quick-replies.tags")}
          >
            {[null, ...tags].map((item) => {
              const on = (item ?? "").toLowerCase() === (tag ?? "").toLowerCase();
              return (
                <button
                  key={item ?? "__all__"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    onTag(on && item !== null ? null : item);
                    onActive(0);
                  }}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition-colors",
                    on
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {item ?? t("quick-replies.all-tags")}
                </button>
              );
            })}
          </div>
        )}

        <ul
          ref={list}
          role="listbox"
          aria-label={t("quick-replies.saved-replies")}
          className="max-h-60 overflow-auto border-t border-border/60"
        >
          {loading &&
            [0, 1, 2].map((row) => (
              <li key={row} className="space-y-1.5 px-3 py-2.5" aria-hidden>
                <div className="h-2.5 w-16 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-surface-2" />
              </li>
            ))}
          {!loading && matches.length === 0 && (
            <li className="px-4 py-6 text-center">
              <p className="text-sm font-medium">
                {replies.length ? t("quick-replies.no-results") : t("quick-replies.empty-none")}
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                {replies.length
                  ? t("quick-replies.no-match-hint", { term: term || tag })
                  : t("quick-replies.empty-none-hint")}
              </p>
              {!replies.length && (
                <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onManage}>
                  {t("quick-replies.create")}
                </Button>
              )}
            </li>
          )}
          {matches.map((reply, index) => {
            const on = index === active;
            return (
              <li
                key={reply.id}
                role="option"
                aria-selected={on}
                onMouseMove={() => on || onActive(index)}
                className={cn(
                  "group/reply relative flex items-start gap-2 border-s-2 px-3 py-2 transition-colors",
                  on ? "border-primary bg-primary-soft/60" : "border-transparent hover:bg-surface-2/60",
                )}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  className="min-w-0 flex-1 cursor-pointer text-start"
                  onClick={() => onInsert(reply)}
                >
                  {reply.tags.length > 0 && (
                    <span className="mb-0.5 flex flex-wrap gap-1">
                      {reply.tags.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-surface-2 px-1.5 py-px text-[11px] font-medium text-muted-foreground"
                        >
                          <Marked text={item} term={term} />
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="line-clamp-2 block text-[13px] leading-snug text-foreground">
                    <Marked text={reply.message} term={term} />
                  </span>
                </button>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-0.5 transition-opacity",
                    on ? "opacity-100" : "opacity-0 group-hover/reply:opacity-100",
                  )}
                >
                  <IconTooltip label={t("quick-replies.insert")}>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      tabIndex={-1}
                      className="size-7 rounded-md"
                      aria-label={t("quick-replies.insert")}
                      onClick={() => onInsert(reply)}
                    >
                      <CornerDownLeft className="size-3.5" aria-hidden />
                    </Button>
                  </IconTooltip>
                  {onSend && (
                    <IconTooltip label={t("quick-replies.send-now")}>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        tabIndex={-1}
                        className="size-7 rounded-md text-primary hover:text-primary"
                        aria-label={t("quick-replies.send-now")}
                        onClick={() => onSend(reply)}
                      >
                        <Send className="size-3.5" aria-hidden />
                      </Button>
                    </IconTooltip>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
