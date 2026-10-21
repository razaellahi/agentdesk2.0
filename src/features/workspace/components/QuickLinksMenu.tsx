import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Link2, Pin, PinOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconTooltip } from "@/components/common/IconTooltip";
import { SearchField } from "@/components/common/ListChrome";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePreferences } from "@/core/agent-settings";
import { useCurrentUser } from "@/core/auth";
import { loadQuickLinks, pinQuickLinks, pinnedLinkIds, type QuickLink } from "../api/extras";

function canView(link: QuickLink, roles: string[]) {
  if (!link.accessRoles.length) return true;
  const allowed = link.accessRoles.map((role) => role.toLowerCase());
  if (allowed.includes("all")) return true;
  return roles.some((role) => allowed.includes(role.toLowerCase()));
}

/** Header menu for role-filtered quick links with pin persistence. */
export function QuickLinksMenu() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const prefs = usePreferences();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["quick-links"],
    enabled: open,
    queryFn: loadQuickLinks,
  });

  const roles = user?.roles ?? [];
  const pinned = useMemo(
    () => new Set(pinnedLinkIds(prefs?.pinned_quick_links)),
    [prefs?.pinned_quick_links],
  );
  const term = search.trim().toLowerCase();
  const links = (query.data ?? [])
    .map((link) => ({ ...link, pinned: pinned.has(link.id) || link.pinned }))
    .filter((link) => canView(link, roles))
    .filter(
      (link) =>
        !term ||
        link.title.toLowerCase().includes(term) ||
        link.url.toLowerCase().includes(term) ||
        (link.description ?? "").toLowerCase().includes(term),
    );
  const pinnedLinks = links.filter((link) => link.pinned);
  const otherLinks = links.filter((link) => !link.pinned);

  const togglePin = (link: QuickLink) => {
    const next = new Set(pinned);
    if (next.has(link.id)) next.delete(link.id);
    else next.add(link.id);
    void pinQuickLinks([...next]).then(() => client.invalidateQueries({ queryKey: ["quick-links"] }));
  };

  const renderList = (items: QuickLink[]) =>
    items.map((link) => (
      <li key={link.id} className="flex items-start gap-1 rounded-md px-1 py-1 hover:bg-muted">
        <button
          type="button"
          className="min-w-0 flex-1 text-start"
          onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
        >
          <span className="block truncate text-sm font-medium">{link.title}</span>
          {link.description && (
            <span className="block truncate text-[12px] text-muted-foreground">{link.description}</span>
          )}
        </button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={link.pinned ? t("app-header.un-pin") : t("app-header.pin")}
          onClick={() => togglePin(link)}
        >
          {link.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
        </Button>
        <ExternalLink className="mt-1.5 size-3.5 text-muted-foreground" />
      </li>
    ));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <IconTooltip label={t("app-header.quick-links")}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="size-9 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label={t("app-header.quick-links")}
          >
            <Link2 className="size-[18px]" />
          </Button>
        </PopoverTrigger>
      </IconTooltip>
      <PopoverContent
        align="end"
        className="w-80 rounded-2xl border border-border bg-surface p-3 shadow-lift"
      >
        <SearchField value={search} onChange={setSearch} placeholder={t("labels.search")} />
        <ul className="mt-2 max-h-80 space-y-1 overflow-auto">
          {pinnedLinks.length > 0 && (
            <>
              <li className="px-1 pt-1 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t("app-header.pinned-links")}
              </li>
              {renderList(pinnedLinks)}
            </>
          )}
          {otherLinks.length > 0 && (
            <>
              <li className="px-1 pt-2 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t("app-header.quick-links")}
              </li>
              {renderList(otherLinks)}
            </>
          )}
          {!query.isLoading && links.length === 0 && (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">
              {t("globals.no-data-available")}
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
