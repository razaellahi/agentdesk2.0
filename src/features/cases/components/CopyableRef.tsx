import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RefId } from "./Fields";

/** A case reference that copies itself on click (unified-agent Cases panel behaviour). */
export function CopyableRef({ value, className }: { value: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      title={t("cases.conversation.copy-ref")}
      aria-label={t("cases.conversation.copy-ref-named", { ref: value })}
      className="rounded hover:bg-surface-2 hover:text-foreground"
      onClick={(event) => {
        event.stopPropagation();
        navigator.clipboard?.writeText(value).then(
          () => toast.success(t("cases.conversation.copied-ref", { ref: value })),
          () => undefined,
        );
      }}
    >
      <RefId value={value} className={className} />
    </button>
  );
}
