import { Download, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";
import { fileKind, fileSize } from "../../model/fileKind";

const IMAGE = new Set(["PNG", "JPG", "JPEG", "GIF", "WEBP", "SVG"]);

/** A page with a folded corner and a coloured band naming its type: the preview of a file we cannot render. */
function Sheet({ ext, band }: { ext: string; band: string }) {
  return (
    <div className="relative mx-auto my-3 h-[5.5rem] w-[4.25rem] rounded-md bg-surface shadow-sm ring-1 ring-black/8 dark:ring-white/10">
      <span className="absolute end-0 top-0 size-4 rounded-ss-none rounded-es-md bg-surface-2 shadow-[-1px_1px_0_rgb(0_0_0/0.08)]" />
      <span className="absolute inset-x-2.5 top-6 space-y-1.5" aria-hidden>
        <span className="block h-1 rounded-full bg-border" />
        <span className="block h-1 w-4/5 rounded-full bg-border" />
        <span className="block h-1 w-3/5 rounded-full bg-border" />
      </span>
      {ext && (
        <span
          className={cn(
            "absolute start-0 bottom-2.5 rounded-e px-1.5 py-px text-[10px] font-bold tracking-wide text-white",
            band,
          )}
        >
          {ext.slice(0, 5)}
        </span>
      )}
    </div>
  );
}

/**
 * A file in the transcript: a preview above (the picture itself, or a sheet in the file type's colour; a
 * PDF viewer in every card would make the transcript heavy to scroll) and, below it, the extension's icon with the name, type and size, and Download.
 */
export function FileCard({
  src,
  name,
  size,
}: {
  src: string;
  name?: string;
  /** Bytes, when the sender's channel reported them. */
  size?: number;
}) {
  const { t } = useTranslation();
  const label = name || t("workspace.file");
  const kind = fileKind(label);
  const Icon = kind.icon;
  const detail = [kind.ext, fileSize(size)].filter(Boolean).join(" · ");
  return (
    <div className="w-64 max-w-full">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("workspace.open-file", { name: label })}
        className="group/preview relative block h-32 overflow-hidden rounded-xl bg-surface"
      >
        {IMAGE.has(kind.ext) ? (
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <Sheet ext={kind.ext} band={kind.band} />
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover/preview:bg-black/25 group-hover/preview:opacity-100">
          <ExternalLink className="size-5 drop-shadow" aria-hidden />
        </span>
      </a>
      <div className="flex items-center gap-2.5 px-1 pt-2 pb-0.5">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", kind.tile)}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] leading-tight font-medium" title={label}>
            {label}
          </span>
          {detail && <span className="block text-[12px] leading-tight text-muted-foreground">{detail}</span>}
        </span>
        <a
          href={src}
          download={label}
          aria-label={t("workspace.download-file", { name: label })}
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        >
          <Download className="size-4" aria-hidden />
        </a>
      </div>
    </div>
  );
}
