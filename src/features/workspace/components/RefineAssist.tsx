import { Check, WandSparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";
import { HoverAction, HoverActions } from "./HoverActions";

/** The line above the reply box while the AI rewrites it. */
export function RefineWorking() {
  const { t } = useTranslation();
  return (
    <div role="status" className="mb-2 px-1 text-xs">
      <span className="desk-ai-text font-medium">{t("chat-features.interactions.refining")}</span>
    </div>
  );
}

/** Reveals `text` a few characters at a time, all at once for people who asked for less motion. */
function useTyped(text: string) {
  const reduced = useMemo(
    () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const [count, setCount] = useState(reduced ? text.length : 0);
  const step = Math.max(1, Math.ceil(text.length / 55));
  useEffect(() => {
    if (count >= text.length) return;
    const timer = setTimeout(() => setCount((current) => Math.min(text.length, current + step)), 24);
    return () => clearTimeout(timer);
  }, [count, text.length, step]);
  return { shown: text.slice(0, count), done: count >= text.length, finish: () => setCount(text.length) };
}

/**
 * The rewritten message, typed out as the AI "writes" it under a flowing gradient edge; once it is done the
 * edge settles and Apply / Discard are the whole choice. Remount it (key) for each new result.
 */
export function RefinedPreview({
  text,
  canApply,
  onApply,
  onDiscard,
}: {
  text: string;
  /** False when the draft changed since the rewrite was asked for. */
  canApply: boolean;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const { t } = useTranslation();
  const { shown, done, finish } = useTyped(text);
  return (
    <div
      role="region"
      aria-label={t("chat-features.interactions.refined-preview")}
      className={cn(
        "group/hover relative mb-2 rounded-xl bg-surface p-3 text-sm shadow-soft",
        done ? "border border-(--ai-2)/35" : "desk-ai-glow",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
        <WandSparkles className="size-3.5 text-(--ai-2)" strokeWidth={1.75} aria-hidden />
        <span className="desk-ai-text">{t("chat-features.interactions.refined-by-ai")}</span>
        {!done && (
          <button
            type="button"
            className="ms-auto text-[12px] font-normal text-muted-foreground hover:text-foreground"
            onClick={finish}
          >
            {t("chat-features.interactions.show-all")}
          </button>
        )}
      </div>
      {/* Screen readers get the whole text at once; the typing is for the eyes. */}
      <p className="sr-only">{text}</p>
      <p className="pe-16 leading-relaxed whitespace-pre-wrap" aria-hidden>
        {shown}
        {!done && <span className="desk-ai-caret" />}
      </p>
      {done && (
        <HoverActions className="top-2">
          <HoverAction label={t("chat-features.interactions.discard")} onClick={onDiscard}>
            <X className="size-3.5" aria-hidden />
          </HoverAction>
          <HoverAction
            label={t("chat-features.interactions.apply")}
            tone="primary"
            disabled={!canApply}
            onClick={onApply}
          >
            <Check className="size-3.5" aria-hidden />
          </HoverAction>
        </HoverActions>
      )}
    </div>
  );
}
