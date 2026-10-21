import { Loader2, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/shared/lib/utils";

/** Stands for "every searchable attribute" (the full-text search); no column has to be picked first. */
export const ALL_FIELDS = "__all__";

/**
 * One search box for the phonebook: typing searches every searchable attribute after a short pause, Enter
 * searches at once, and the "in" menu at the end narrows it to a single attribute when the agent wants that.
 */
export function CustomerSearchBar({
  value,
  onChange,
  onSubmit,
  field,
  onField,
  fields,
  busy,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  field: string;
  onField: (field: string) => void;
  fields: { field: string; header: string }[];
  busy?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const placeholder = t("phonebook.search-placeholder");
  return (
    <form
      role="search"
      className={cn(
        "flex h-9 min-w-0 items-center rounded-lg border border-border bg-surface transition-colors focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Search className="ms-3 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      {busy && <Loader2 className="me-1 size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="me-1 grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          aria-label={t("phonebook.clear-search")}
        >
          <X className="size-3.5" />
        </button>
      )}
      {fields.length > 0 && (
        <Select value={field} onValueChange={onField}>
          <SelectTrigger
            aria-label={t("phonebook.search-in")}
            className="h-full w-auto min-w-28 shrink-0 gap-1.5 rounded-s-none rounded-e-lg border-0 border-s border-border bg-surface-2/60 px-3 text-xs font-medium shadow-none focus-visible:ring-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value={ALL_FIELDS}>{t("phonebook.search-all-fields")}</SelectItem>
            {fields.map((item) => (
              <SelectItem key={item.field} value={item.field}>
                {item.header}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </form>
  );
}
