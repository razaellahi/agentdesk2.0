import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getSession } from "@/core/auth";
import { cn } from "@/shared/lib/utils";
import { createLabelForCustomer, listLabels, type Label } from "./api";

/** Labels a customer can carry, as ids (the API stores ids; some payloads hydrate them to objects). */
export function labelIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : String((item as { _id?: string })?._id ?? "")))
    .filter(Boolean);
}

// Stored on the label (a data value, not a UI colour), like unified-agent's default grey.
// eslint-disable-next-line no-restricted-syntax
const NEW_LABEL_COLOR = "#a9a9a9";
const MAX_NAME = 100;

function Dot({ color }: { color?: string }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color || "var(--primary)" }}
      aria-hidden
    />
  );
}

/**
 * Customer labels field, as in unified-agent: a searchable multi-select with each
 * label's colour dot, and typing a name that doesn't exist offers to create it
 * (grey by default) and selects it straight away.
 */
export function LabelPicker({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const labels = useQuery({ queryKey: ["labels"], queryFn: listLabels });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const all = labels.data ?? [];
  const selected = value
    .map((id) => all.find((label) => label._id === id))
    .filter((label): label is Label => !!label);
  const typed = search.trim();
  const exists = all.some((label) => label.name.toLowerCase() === typed.toLowerCase());

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
    setSearch("");
  };

  const create = async () => {
    if (!typed || creating) return;
    if (exists) return void toast.error(t("snackbar.Name-already-exists"));
    if (typed.length > MAX_NAME) return void toast.error(t("snackbar.Max-100-characters-are-allowed"));
    setCreating(true);
    try {
      const created = (await createLabelForCustomer({
        name: typed,
        colorCode: NEW_LABEL_COLOR,
        createdBy: getSession().user?.username,
      })) as Label | undefined;
      await queryClient.invalidateQueries({ queryKey: ["labels"] });
      if (created?._id) onChange([...value, created._id]);
      setSearch("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "flex min-h-9 w-full items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1 text-start text-sm shadow-xs transition-colors",
              "hover:border-ring/60 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-50",
            )}
          >
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {selected.length === 0 && (
                <span className="px-1 text-muted-foreground">{t("labels.search")}</span>
              )}
              {selected.map((label) => (
                <span
                  key={label._id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted py-0.5 ps-2 pe-1 text-xs"
                >
                  <Dot color={label.colorCode} />
                  <span className="truncate">{label.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`${t("globals.delete")} ${label.name}`}
                    className="grid size-4 place-items-center rounded-full hover:bg-surface-3"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggle(label._id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        toggle(label._id);
                      }
                    }}
                  >
                    <X className="size-3" aria-hidden />
                  </span>
                </span>
              ))}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0">
          <Command>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={t("globals.Search")}
              aria-label={t("labels.search")}
            />
            <CommandList>
              {!typed && all.length === 0 && <CommandEmpty>{t("globals.no-data-available")}</CommandEmpty>}
              <CommandGroup>
                {all.map((label) => {
                  const on = value.includes(label._id);
                  return (
                    <CommandItem
                      key={label._id}
                      value={label.name}
                      onSelect={() => toggle(label._id)}
                      className="gap-2"
                    >
                      <Dot color={label.colorCode} />
                      <span className="min-w-0 flex-1 truncate">{label.name}</span>
                      {on && <Check className="size-4 text-primary" aria-hidden />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {typed && !exists && (
                <CommandGroup forceMount>
                  <CommandItem
                    // Never filtered out by the search, so "add" stays offered while typing.
                    value={`__add__${typed}`}
                    forceMount
                    disabled={creating}
                    onSelect={() => void create()}
                    className="gap-2 text-primary"
                  >
                    <Plus className="size-4" aria-hidden />
                    <span className="truncate">
                      {t("customer-schema.add")} “{typed}”
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
