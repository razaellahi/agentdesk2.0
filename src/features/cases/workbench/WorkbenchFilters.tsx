import { Check, ChevronDown, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SearchField } from "@/components/common/ListChrome";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/shared/lib/utils";
import type { AssigneeFilterMode } from "../model/drill";

export interface FilterOption {
  id: string;
  label: string;
}

function FilterChip({
  label,
  value,
  active,
  children,
}: {
  label: string;
  value: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors hover:bg-surface-2",
            active ? "border-primary/60 bg-primary-soft/60 text-primary" : "border-border text-foreground",
          )}
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="max-w-40 truncate font-medium">{value}</span>
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <div role="listbox" aria-label={label}>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Option({
  checked,
  onSelect,
  hint,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  /** Quiet second line, e.g. a team's open and at-risk counts. */
  hint?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-surface-2"
    >
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded border",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-border-strong",
        )}
        aria-hidden
      >
        {checked && <Check className="size-3" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate">{children}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

function summary(
  options: FilterOption[],
  selected: ReadonlySet<string>,
  all: string,
  many: (n: number) => string,
) {
  const picked = options.filter((o) => selected.has(o.id));
  if (picked.length === 0 || picked.length === options.length) return all;
  if (picked.length <= 2) return picked.map((o) => o.label).join(" · ");
  return many(picked.length);
}

export function WorkbenchFilters({
  search,
  searchLoading,
  onSearch,
  statusOptions,
  statuses,
  onToggleStatus,
  priorityOptions,
  priorities,
  onTogglePriority,
  groups,
  group,
  onGroup,
  assignee,
  onAssignee,
  onClear,
  statusActive: statusActiveProp,
  statusSummary,
  assigneeActive: assigneeActiveProp,
  className,
  children,
}: {
  search: string;
  searchLoading: boolean;
  onSearch: (value: string) => void;
  statusOptions: FilterOption[];
  statuses: ReadonlySet<string>;
  onToggleStatus: (id: string) => void;
  priorityOptions: FilterOption[];
  priorities: ReadonlySet<string>;
  onTogglePriority: (id: string) => void;
  groups: { key: string; label: string; hint?: string }[];
  group: string | null;
  onGroup: (key: string | null) => void;
  assignee: AssigneeFilterMode;
  onAssignee: (mode: AssigneeFilterMode) => void;
  onClear: () => void;
  /** Whether the status / assignee filter differs from what this view starts with. */
  statusActive?: boolean;
  /** A plain-words name for the selected statuses ("Open"), instead of a count. */
  statusSummary?: string;
  assigneeActive?: boolean;
  className?: string;
  /** Controls kept at the end of the same row (counts, sort, density). */
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const all = t("cases.filters.all");
  const many = (n: number) => t("cases.filters.n-selected", { count: n });
  const assigneeOptions: { id: AssigneeFilterMode; label: string }[] = [
    { id: "all", label: t("cases.filters.anyone") },
    { id: "unassigned", label: t("cases.unassigned") },
    { id: "me", label: t("cases.filters.assigned-to-me") },
    { id: "assigned", label: t("cases.filters.has-assignee") },
  ];
  const statusActive = statusActiveProp ?? (statuses.size > 0 && statuses.size < statusOptions.length);
  const assigneeActive = assigneeActiveProp ?? assignee !== "all";
  const priorityActive = priorities.size > 0 && priorities.size < priorityOptions.length;
  const hasActive =
    Boolean(search.trim()) || statusActive || priorityActive || Boolean(group) || assigneeActive;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="toolbar"
      aria-label={t("cases.filters.label")}
    >
      <div className="relative">
        <SearchField
          value={search}
          onChange={onSearch}
          placeholder={t("cases.filters.search")}
          className="w-56"
        />
        {searchLoading && (
          <Loader2 className="absolute end-8 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <FilterChip
        label={t("cases.filters.status")}
        value={statusSummary ?? summary(statusOptions, statuses, all, many)}
        active={statusActive}
      >
        {statusOptions.map((o) => (
          <Option key={o.id} checked={statuses.has(o.id)} onSelect={() => onToggleStatus(o.id)}>
            {o.label}
          </Option>
        ))}
      </FilterChip>
      <FilterChip
        label={t("cases.filters.priority")}
        value={summary(priorityOptions, priorities, all, many)}
        active={priorityActive}
      >
        {priorityOptions.map((o) => (
          <Option key={o.id} checked={priorities.has(o.id)} onSelect={() => onTogglePriority(o.id)}>
            {o.label}
          </Option>
        ))}
      </FilterChip>
      <FilterChip
        label={t("cases.routing-group")}
        value={group ? (groups.find((g) => g.key === group)?.label ?? group) : all}
        active={Boolean(group)}
      >
        <Option checked={!group} onSelect={() => onGroup(null)}>
          {t("cases.filters.all-teams")}
        </Option>
        {groups.map((g) => (
          <Option key={g.key} checked={group === g.key} hint={g.hint} onSelect={() => onGroup(g.key)}>
            {g.label}
          </Option>
        ))}
      </FilterChip>
      <FilterChip
        label={t("cases.filters.assignee")}
        value={assigneeOptions.find((o) => o.id === assignee)?.label ?? all}
        active={assigneeActive}
      >
        {assigneeOptions.map((o) => (
          <Option key={o.id} checked={assignee === o.id} onSelect={() => onAssignee(o.id)}>
            {o.label}
          </Option>
        ))}
      </FilterChip>
      {hasActive && (
        <Button variant="link" size="sm" onClick={onClear}>
          {t("cases.filters.clear")}
        </Button>
      )}
      {children && <div className="ms-auto flex items-center gap-1">{children}</div>}
    </div>
  );
}
