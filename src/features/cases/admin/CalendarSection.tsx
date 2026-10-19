import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { AdminCard, AdminFrame, Banner } from "./AdminFrame";

/** Monday-first illustrative week: 09:00–17:00 on weekdays. */
const WEEK = [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, open: day >= 1 && day <= 5 }));

/**
 * Business calendar: deliberately a disabled preview. The case backend has no
 * calendar entity yet and computes SLA due dates 24/7 from creation, so nothing
 * here is loaded or saved (admin-calendar.component.ts, handover §6.2).
 */
export function CalendarSection() {
  const { t, i18n } = useTranslation();
  const dayName = (day: number) =>
    new Intl.DateTimeFormat(i18n.language, { weekday: "long" }).format(new Date(Date.UTC(2024, 0, 7 + day)));
  return (
    <AdminFrame title={t("cases.admin.calendar.title")} description={t("cases.admin.calendar.description")}>
      <Banner tone="info">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <strong>{t("cases.admin.calendar.not-available")}</strong>
          <p className="text-muted-foreground">{t("cases.admin.calendar.not-available-hint")}</p>
        </div>
      </Banner>
      <AdminCard title={t("cases.admin.calendar.weekly")} hint={t("cases.admin.calendar.preview-only")}>
        <ul className="divide-y divide-border">
          {WEEK.map(({ day, open }) => (
            <li key={day} className="flex items-center gap-3 py-2 text-sm opacity-70">
              <Switch checked={open} disabled aria-label={dayName(day)} />
              <span className="w-28 font-medium">{dayName(day)}</span>
              <span className="text-muted-foreground tabular-nums">
                {open ? "09:00 – 17:00" : t("cases.admin.calendar.closed")}
              </span>
            </li>
          ))}
        </ul>
      </AdminCard>
    </AdminFrame>
  );
}
