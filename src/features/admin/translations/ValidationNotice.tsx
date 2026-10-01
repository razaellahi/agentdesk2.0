import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ValidationDetails } from "./tools";

function reasonText(t: (k: string) => string, d: ValidationDetails) {
  return t(`admin-translations.validation.${d.reason}`);
}

/** Banner + details dialog (unified-admin TranslationValidationDialogComponent). */
export function ValidationNotice({
  details,
  onDismiss,
}: {
  details: ValidationDetails;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const title =
    details.kind === "compare"
      ? t("admin-translations.validation.compare-title")
      : t("admin-translations.validation.title");
  return (
    <>
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg border border-warning bg-warning-soft px-4 py-3 text-sm"
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-warning-text">{title}</p>
          <p className="text-medium">
            {reasonText(t, details)}{" "}
            {t("admin-translations.validation.summary", {
              missing: details.missingKeys.length,
              extra: details.extraKeys.length,
            })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t("admin-translations.validation.details")}
        </Button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label={t("globals.close")}
        >
          <X className="size-4" />
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{reasonText(t, details)}</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-surface-2 p-3">
              <dt className="text-muted-foreground">{details.leftLabel}</dt>
              <dd className="text-lg font-semibold tabular">{details.leftKeyCount}</dd>
            </div>
            <div className="rounded-md bg-surface-2 p-3">
              <dt className="text-muted-foreground">{details.rightLabel}</dt>
              <dd className="text-lg font-semibold tabular">{details.rightKeyCount}</dd>
            </div>
          </dl>
          {details.structureMismatch && (
            <p className="text-sm text-warning-text">{t("admin-translations.validation.structure")}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["missing-keys", details.missingKeys],
                ["extra-keys", details.extraKeys],
              ] as const
            ).map(([label, keys]) => (
              <div key={label}>
                <h4 className="mb-1.5 text-sm font-semibold">
                  {t(`admin-translations.validation.${label}`)}{" "}
                  <span className="text-muted-foreground tabular">({keys.length})</span>
                </h4>
                <ul className="max-h-64 overflow-auto rounded-md border bg-surface-2 p-2 font-mono text-xs">
                  {keys.length ? (
                    keys.map((k) => (
                      <li key={k} className="truncate py-0.5">
                        {k}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">—</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
