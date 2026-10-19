import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";
import { getConfig } from "@/config";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/core/auth";
import { useLanguage } from "@/core/i18n";
import { useResolvedTheme } from "@/core/theme";
import { buildGrafanaUrl, type InsightDashboard } from "./grafanaUrl";

function Dashboard({ dashboard }: { dashboard: InsightDashboard }) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const theme = useResolvedTheme();
  const language = useLanguage();
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const config = getConfig();
  const url = buildGrafanaUrl({
    dashboard,
    gatUrl: config.GAT_URL,
    pageOrigin: globalThis.location.origin,
    refreshMs: config.DASHBOARD_REFRESH_TIME,
    user,
    theme,
    language,
    hostname: globalThis.location.hostname,
  });

  if (!url) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title={t("supervisor.dashboard-unavailable")}
        description={t("supervisor.dashboard-unavailable-message")}
      />
    );
  }

  return (
    <div className="desk-canvas relative flex h-full min-h-[32rem] flex-col p-4 md:p-5">
      <div className="desk-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-surface/70 backdrop-blur-sm">
            <p className="text-sm text-muted-foreground">{t("supervisor.loading-dashboard")}</p>
          </div>
        )}
        <iframe
          key={attempt}
          src={url}
          title={t("supervisor.grafana-dashboard-title")}
          className="min-h-0 w-full flex-1 border-0 bg-surface"
          onLoad={() => setLoading(false)}
        />
        <div className="flex justify-end gap-2 border-t border-border/70 px-3 py-2.5">
          <Button variant="outline" size="sm" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              {t("supervisor.grafana-dashboard-title")}
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoading(true);
              setAttempt((n) => n + 1);
            }}
          >
            {t("supervisor.retry")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SummaryPage() {
  return <Dashboard dashboard="summary" />;
}

export function AgentPerformancePage() {
  return <Dashboard dashboard="agent-performance" />;
}

export function TeamStatsPage() {
  return <Dashboard dashboard="team-stats" />;
}

export function TeamDetailPage() {
  return <Dashboard dashboard="team-detail" />;
}
