import {
  CalendarDays,
  FolderTree,
  ListChecks,
  Network,
  Shuffle,
  SlidersHorizontal,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { cn } from "@/shared/lib/utils";
import { CalendarSection } from "./CalendarSection";
import { PolicySection } from "./PolicySection";
import { DistributionSection, MappingSection, TaxonomySection } from "./RoutingSections";
import { SlaSection } from "./SlaSection";
import { StatusesSection } from "./StatusesSection";

export type AdminSection =
  "statuses" | "taxonomy" | "mapping" | "distribution" | "sla" | "calendar" | "policy";

interface NavEntry {
  id: AdminSection;
  icon: LucideIcon;
  comingSoon?: boolean;
}

/** Same grouping as case-console admin-nav.component.ts. */
const GROUPS: { id: string; items: NavEntry[] }[] = [
  {
    id: "case-handling",
    items: [
      { id: "statuses", icon: ListChecks },
      { id: "taxonomy", icon: FolderTree },
      { id: "mapping", icon: Network },
      { id: "distribution", icon: Shuffle },
    ],
  },
  {
    id: "service-levels",
    items: [
      { id: "sla", icon: Timer },
      { id: "calendar", icon: CalendarDays, comingSoon: true },
    ],
  },
  { id: "tenant", items: [{ id: "policy", icon: SlidersHorizontal }] },
];

const SECTIONS = GROUPS.flatMap((g) => g.items.map((i) => i.id));

/** Case Management settings: statuses, taxonomy, routing, distribution, SLA, calendar and policy. */
export default function CaseAdminPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const requested = params.get("section") as AdminSection | null;
  const section: AdminSection = requested && SECTIONS.includes(requested) ? requested : "statuses";
  const go = (id: AdminSection) => setParams({ section: id }, { replace: true });

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <nav
        aria-label={t("cases.admin.nav")}
        className="shrink-0 border-b border-border p-2 md:w-60 md:overflow-y-auto md:border-e md:border-b-0"
      >
        {GROUPS.map((group) => (
          <div key={group.id} className="mb-3">
            <p className="px-3 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              {t(`cases.admin.group.${group.id}`)}
            </p>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={section === item.id ? "page" : undefined}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-start hover:bg-surface-2",
                  section === item.id && "bg-primary-soft text-primary hover:bg-primary-soft",
                )}
              >
                <item.icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {t(`cases.admin.${item.id}.nav`)}
                    {item.comingSoon && (
                      <span className="rounded-full bg-surface-2 px-1.5 text-[10px] font-normal text-muted-foreground">
                        {t("cases.admin.coming-soon")}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t(`cases.admin.${item.id}.nav-hint`)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {section === "statuses" && <StatusesSection />}
        {section === "taxonomy" && <TaxonomySection />}
        {section === "mapping" && <MappingSection />}
        {section === "distribution" && <DistributionSection />}
        {section === "sla" && <SlaSection />}
        {section === "calendar" && <CalendarSection />}
        {section === "policy" && <PolicySection onOpenDistribution={() => go("distribution")} />}
      </div>
    </div>
  );
}
