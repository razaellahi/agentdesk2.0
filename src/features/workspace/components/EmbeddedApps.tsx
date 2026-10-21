import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Conversation } from "../model/types";

/** Iframes for third-party gadgets attached to the conversation. */
export function EmbeddedApps({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation();
  const apps = conversation.embeddedApps.filter((app) => typeof app.value === "string" && app.value);
  if (apps.length === 0) return null;
  return (
    <section className="border-t bg-canvas/40 p-3">
      <h4 className="mb-2 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
        {t("chat-features.interactions.third-party-apps")}
      </h4>
      <div className="grid gap-3">
        {apps.map((app) => (
          <div key={app.id ?? String(app.value)} className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-3 py-1.5">
              <span className="truncate text-xs font-medium">
                {app.title || t("chat-features.interactions.third-party-apps")}
              </span>
              <a
                href={String(app.value)}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("app-header.open-in-new-tab")}
              >
                <ExternalLink className="size-3.5" />
              </a>
            </div>
            <iframe title={app.title || "app"} src={String(app.value)} className="h-64 w-full bg-white" />
          </div>
        ))}
      </div>
    </section>
  );
}
