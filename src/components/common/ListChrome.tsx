import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/lib/utils";

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-9 rounded-lg border-border bg-surface ps-9 pe-8 text-sm shadow-none focus-visible:border-primary"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute end-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** Pages to show as numbers: the first, the last and a window around the current one ("…" for gaps). */
function pageWindow(page: number, count: number): (number | "gap")[] {
  const wanted = new Set([0, count - 1, page - 1, page, page + 1]);
  if (page <= 1) [2, 3].forEach((n) => wanted.add(n));
  if (page >= count - 2) [count - 3, count - 4].forEach((n) => wanted.add(n));
  const sorted = [...wanted].filter((n) => n >= 0 && n < count).sort((x, y) => x - y);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1]! > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

const pagerButton =
  "size-8 rounded-lg border-border bg-surface text-foreground shadow-none hover:bg-surface-2 disabled:border-border/50 disabled:bg-transparent disabled:text-muted-foreground/60 disabled:opacity-100";

/**
 * Footer paging: first / previous / page numbers / next / last, the visible range, and
 * (when `pageSizeOptions` is given) a rows-per-page choice as in unified-agent's tables.
 */
export function Pager({
  page,
  pageSize,
  total,
  onPage,
  pageSizeOptions,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSize?: (size: number) => void;
}) {
  const { t } = useTranslation();
  const count = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const atStart = page === 0;
  const atEnd = to >= total;
  return (
    <nav
      aria-label={t("globals.pagination", { defaultValue: "Pagination" })}
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      {pageSizeOptions && onPageSize && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t("globals.rows-per-page", { defaultValue: "Rows per page" })}
          <select
            value={pageSize}
            onChange={(event) => onPageSize(Number(event.target.value))}
            className="h-8 rounded-lg border border-border bg-surface px-2 text-xs font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      )}
      <span className="text-xs text-muted-foreground tabular-nums">
        {t("globals.page-range", { from, to, total })}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={pagerButton}
          disabled={atStart}
          aria-label={t("globals.first-page", { defaultValue: "First page" })}
          title={t("globals.first-page", { defaultValue: "First page" })}
          onClick={() => onPage(0)}
        >
          <ChevronsLeft className="size-4 rtl:rotate-180" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={pagerButton}
          disabled={atStart}
          aria-label={t("globals.previous-page", { defaultValue: "Previous page" })}
          title={t("globals.previous-page", { defaultValue: "Previous page" })}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </Button>
        {pageWindow(page, count).map((entry, index) =>
          entry === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-xs text-muted-foreground" aria-hidden>
              …
            </span>
          ) : (
            <Button
              key={entry}
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                pagerButton,
                "min-w-8 px-2 text-xs font-medium tabular-nums",
                entry === page && "border-primary bg-primary text-primary-foreground hover:bg-primary",
              )}
              aria-current={entry === page ? "page" : undefined}
              aria-label={t("globals.page-number", { defaultValue: "Page {{page}}", page: entry + 1 })}
              onClick={() => onPage(entry)}
            >
              {entry + 1}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={pagerButton}
          disabled={atEnd}
          aria-label={t("globals.next-page", { defaultValue: "Next page" })}
          title={t("globals.next-page", { defaultValue: "Next page" })}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={pagerButton}
          disabled={atEnd}
          aria-label={t("globals.last-page", { defaultValue: "Last page" })}
          title={t("globals.last-page", { defaultValue: "Last page" })}
          onClick={() => onPage(count - 1)}
        >
          <ChevronsRight className="size-4 rtl:rotate-180" />
        </Button>
      </div>
    </nav>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium tracking-tight text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
