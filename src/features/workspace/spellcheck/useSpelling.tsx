import { SpellCheck } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import { findMisspelled, loadDictionary, suggest } from "./client";
import { replaceToken, tokenAt, tokenize, type Token } from "./tokenize";

const CHECK_DEBOUNCE_MS = 350;
const MIRRORED = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "textIndent",
  "tabSize",
] as const;

interface Options {
  text: string;
  enabled: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onReplace: (text: string) => void;
}

/**
 * Dictionary spell checking for the chat composer (unified-agent message-composer
 * + SpellcheckService): misspelled words get a wavy underline drawn by a mirror
 * layer behind the textarea, and the word under the caret offers suggestions.
 * Languages without a bundled dictionary keep the browser's own spell checker.
 */
export function useSpelling({ text, enabled, textareaRef, onReplace }: Options) {
  const { t } = useTranslation();
  const language = useLanguage();
  const [dictionary, setDictionary] = useState<{ lang: string; ok: boolean } | null>(null);
  const [misspelled, setMisspelled] = useState<Set<string>>(new Set());
  const [caret, setCaret] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<{ word: string; items: string[] } | null>(null);
  const mirror = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void loadDictionary(language).then((ok) => !cancelled && setDictionary({ lang: language, ok }));
    return () => {
      cancelled = true;
    };
  }, [enabled, language]);

  const active = enabled && dictionary?.lang === language && dictionary.ok;
  const tokens = useMemo(() => (active ? tokenize(text) : []), [active, text]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void findMisspelled(tokens.map((tk) => tk.word)).then((set) => !cancelled && setMisspelled(set));
    }, CHECK_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, tokens]);

  // The token under the caret, but never the word still being typed at the end.
  const current: Token | null = useMemo(() => {
    if (!active || caret === null) return null;
    const token = tokenAt(tokens, caret);
    if (!token || !misspelled.has(token.word)) return null;
    if (token.end === text.length && caret === text.length) return null;
    return token;
  }, [active, caret, tokens, misspelled, text.length]);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    void suggest(current.word).then((items) => !cancelled && setSuggestions({ word: current.word, items }));
    return () => {
      cancelled = true;
    };
  }, [current]);

  // Keep the mirror's box metrics identical to the textarea.
  useLayoutEffect(() => {
    const area = textareaRef.current;
    const layer = mirror.current;
    if (!active || !area || !layer) return;
    const sync = () => {
      const style = getComputedStyle(area);
      for (const key of MIRRORED) layer.style[key] = style[key];
      layer.style.borderStyle = "solid";
      layer.style.borderColor = "transparent";
      layer.scrollTop = area.scrollTop;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(area);
    return () => observer.disconnect();
  }, [active, textareaRef]);

  const trackCaret = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    setCaret(el.selectionStart === el.selectionEnd ? el.selectionStart : null);
    if (mirror.current) mirror.current.scrollTop = el.scrollTop;
  };

  const apply = (replacement: string) => {
    if (!current) return;
    const next = replaceToken(text, current, replacement);
    onReplace(next.text);
    setSuggestions(null);
    requestAnimationFrame(() => {
      const area = textareaRef.current;
      if (!area) return;
      area.focus();
      area.setSelectionRange(next.caret, next.caret);
      setCaret(next.caret);
    });
  };

  const overlay: ReactNode = active ? (
    <div
      ref={mirror}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl break-words whitespace-pre-wrap text-transparent"
    >
      {renderMarked(text, tokens, misspelled)}
      {"​"}
    </div>
  ) : null;

  const shown = current && suggestions?.word === current.word ? suggestions.items : null;
  const bar: ReactNode =
    current && shown ? (
      <div
        role="toolbar"
        aria-label={t("workspace.spelling-suggestions", { word: current.word })}
        className="flex flex-wrap items-center gap-1.5 px-1 pb-1 text-xs"
      >
        <SpellCheck className="size-3.5 text-destructive-text" aria-hidden />
        <span className="text-muted-foreground">
          {shown.length
            ? t("workspace.did-you-mean")
            : t("workspace.no-spelling-suggestions", { word: current.word })}
        </span>
        {shown.map((s) => (
          <button
            key={s}
            type="button"
            // mousedown keeps the textarea focused and the caret in place.
            onMouseDown={(e) => {
              e.preventDefault();
              apply(s);
            }}
            className="rounded-full border border-border-primary bg-primary-soft px-2 py-0.5 font-medium text-primary hover:bg-primary hover:text-primary-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    ) : null;

  return {
    active,
    overlay,
    suggestions: bar,
    textareaProps: {
      // Our dictionary replaces the browser's checker so words are not underlined twice.
      spellCheck: enabled && !active,
      onSelect: trackCaret,
      onScroll: trackCaret,
      className: cn(active && "relative bg-transparent"),
    },
  };
}

function renderMarked(text: string, tokens: Token[], misspelled: Set<string>): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const token of tokens) {
    if (!misspelled.has(token.word)) continue;
    if (token.start > last) out.push(text.slice(last, token.start));
    out.push(
      <span
        key={token.start}
        className="underline decoration-destructive decoration-wavy decoration-from-font underline-offset-2"
      >
        {token.word}
      </span>,
    );
    last = token.end;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
