import type { Label } from "./api";
import { cn } from "@/shared/lib/utils";

/**
 * A customer's labels as unified-agent shows them: small overlapping colour dots (the
 * label's name is the tooltip), not text chips, so a name never gets crowded out.
 */
export function LabelDots({ labels, className }: { labels: Label[]; className?: string }) {
  if (labels.length === 0) return null;
  return (
    <ul
      className={cn("inline-flex items-center ps-1.5", className)}
      aria-label={labels.map((l) => l.name).join(", ")}
    >
      {labels.map((label) => (
        <li
          key={label._id ?? label.name}
          title={label.name}
          className="-ms-1.5 size-3.5 rounded-full border-2 border-surface"
          style={{ backgroundColor: label.colorCode || "var(--primary)" }}
        >
          <span className="sr-only">{label.name}</span>
        </li>
      ))}
    </ul>
  );
}
