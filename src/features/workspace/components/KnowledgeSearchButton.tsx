import { BookOpen, Loader2, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { IconTooltip } from "@/components/common/IconTooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDeskSettings } from "@/core/agent-settings";
import { cn } from "@/shared/lib/utils";
import { searchKnowledgeBase, type KnowledgeBaseHit } from "../api";

/**
 * Knowledge base search from the conversation header. Shown when the desk's knowledge flag is on,
 * the same switch that shows the Knowledge section in customer info (unified-agent).
 */
export function KnowledgeSearchButton() {
  const { t, i18n } = useTranslation();
  const url = useDeskSettings()?.knowledgeBaseUrl ?? "";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<KnowledgeBaseHit[]>([]);
  const title = t("chat-features.customer-info.knowledge-base.title");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim() || busy || !url) return;
    setBusy(true);
    searchKnowledgeBase({ url, query, language: i18n.language || "en" })
      .then((hit) => {
        setHits((prev) => [hit, ...prev.filter((row) => row.query !== hit.query)].slice(0, 5));
        setQuery("");
      })
      .catch((error: unknown) => toast.error(String(error)))
      .finally(() => setBusy(false));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <IconTooltip label={title}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={title}
            className={cn(
              "size-9 shrink-0 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              open && "bg-primary-soft text-primary",
            )}
          >
            <BookOpen className="size-5" aria-hidden />
          </Button>
        </PopoverTrigger>
      </IconTooltip>
      <PopoverContent
        align="end"
        collisionPadding={8}
        className="w-[min(26rem,calc(100vw-1rem))] space-y-3 rounded-2xl border border-border bg-surface p-3 shadow-lift"
      >
        <p className="text-sm font-semibold">{title}</p>
        <form onSubmit={submit} className="flex gap-1.5">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("chat-features.customer-info.knowledge-base.placeholder")}
            aria-label={t("chat-features.customer-info.knowledge-base.placeholder")}
            className="h-9 rounded-lg"
          />
          <Button
            type="submit"
            size="icon"
            className="size-9 shrink-0 rounded-lg"
            disabled={busy || !query.trim() || !url}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
        </form>
        {hits.length > 0 && (
          <div className="max-h-96 space-y-2.5 overflow-auto">
            {hits.map((hit) => (
              <article key={hit.query} className="space-y-1.5 rounded-xl border border-border/60 bg-card p-3">
                <p className="text-xs font-semibold text-foreground">{hit.query}</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {hit.answer}
                </p>
              </article>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
