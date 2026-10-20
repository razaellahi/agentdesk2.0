import { useTranslation } from "react-i18next";
import { formatDataValue } from "../model/conversationInsight";
import type { WebChannelInfo } from "../model/webChannel";

/** The web chat's device, browser, locale and submitted form, shown when an active web session is opened. */
export function WebChannelDetails({
  info,
  display,
}: {
  /** Null for sessions that are not web chats. */
  info: WebChannelInfo | null;
  display: (value: unknown, key: string) => string;
}) {
  const { t } = useTranslation();
  if (!info) return null;
  const facts = [
    { key: "device", label: t("chat-features.customer-info.device"), value: info.deviceType },
    { key: "browser", label: t("chat-features.customer-info.browser"), value: info.browser },
    { key: "country", label: t("chat-features.customer-info.country"), value: info.country },
    { key: "language", label: t("chat-features.customer-info.language"), value: info.language },
  ].filter((fact): fact is { key: string; label: string; value: string } => Boolean(fact.value));

  if (facts.length === 0 && info.formData.length === 0) return null;
  return (
    <div className="space-y-3 pt-3">
      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          {facts.map((fact) => (
            <div key={fact.key} className="min-w-0">
              <dt className="leading-4 text-muted-foreground">{fact.label}</dt>
              <dd className="truncate leading-5 font-medium text-foreground capitalize" title={fact.value}>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {info.formData.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t("chat-features.customer-info.form-data")}
          </p>
          <dl className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border/60 text-xs">
            {info.formData.map((field) => (
              <div
                key={field.key}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 px-2.5 py-1.5"
              >
                <dt className="truncate text-muted-foreground" title={field.key}>
                  {field.key}
                </dt>
                <dd className="break-words text-foreground">
                  {display(formatDataValue(field.value), field.key)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
