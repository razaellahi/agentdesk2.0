import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AiWidgetError, generateWidgetConfig } from "./aiWidget";
import type { WidgetConfig } from "./model";
import { WidgetView } from "./WidgetView";

const SUGGESTIONS = ["agent-stats", "queue-sla", "team-occupancy"] as const;

/** Prompt → generated widget preview → refine or deploy (source ai-widget-generator). */
export function AiWidgetDialog({
  onDeploy,
  onRefine,
  onClose,
}: {
  onDeploy: (config: WidgetConfig) => void;
  onRefine: (config: WidgetConfig) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<WidgetConfig | null>(null);
  const k = (key: string) => t(`dashboard.aiWidgetGenerator.${key}`);

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError("");
    setPreview(null);
    try {
      setPreview(await generateWidgetConfig(prompt.trim(), setProgress));
    } catch (err) {
      const code = err instanceof AiWidgetError ? err.code : "INIT_FAILED";
      setError(
        k(
          { UNSUPPORTED: "unsupported", INIT_FAILED: "init-failed", INVALID_RESPONSE: "invalid-response" }[
            code
          ],
        ),
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            {k("title")}
          </DialogTitle>
          <DialogDescription>{k("subtitle")}</DialogDescription>
        </DialogHeader>

        {!preview && (
          <div className="space-y-3">
            <Textarea
              aria-label={k("title")}
              placeholder={k("prompt-placeholder")}
              value={prompt}
              disabled={busy}
              rows={3}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void generate();
              }}
            />
            {!busy && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{k("try-something-like")}</span>
                {SUGGESTIONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="rounded-full border border-border px-2.5 py-1 hover:bg-muted hover:text-foreground"
                    onClick={() => setPrompt(k(`suggestion.${key}`))}
                  >
                    {k(`suggestion.${key}`)}
                  </button>
                ))}
              </div>
            )}
            {busy && (
              <div role="status" className="flex items-start gap-3 rounded-lg bg-muted/60 p-3 text-sm">
                <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" aria-hidden />
                <div>
                  <p className="font-medium">{k("sourcing-intelligence")}</p>
                  <p className="text-xs text-muted-foreground">{progress || k("processing")}</p>
                </div>
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive-text"
              >
                {error}
              </p>
            )}
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-success-text">{k("intelligence-formed")}</p>
              <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                <RotateCcw className="size-3.5" />
                {k("retry")}
              </Button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-border p-3 text-sm sm:grid-cols-4">
              {(
                [
                  ["preview-title", preview.title],
                  ["preview-category", preview.category],
                  ["preview-metric", preview.metric],
                  ["preview-visualization", preview.visualizationType],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{k(label)}</dt>
                  <dd className="truncate font-medium capitalize">{value.toLowerCase()}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{k("live-preview")}</p>
              <div className="rounded-lg border border-border p-3">
                <WidgetView config={preview} interval={30} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {preview ? (
            <>
              <Button variant="ghost" onClick={onClose}>
                {k("discard")}
              </Button>
              <Button variant="outline" onClick={() => onRefine(preview)}>
                {k("refine-selection")}
              </Button>
              <Button onClick={() => onDeploy(preview)}>{k("deploy-to-dashboard")}</Button>
            </>
          ) : (
            <Button disabled={!prompt.trim() || busy} onClick={() => void generate()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {error ? k("try-again") : k("generate-button")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
