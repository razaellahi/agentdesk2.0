import type { ChannelSession } from "./types";

export interface FormField {
  key: string;
  value: unknown;
}

/** What the web chat reported about the visitor's device, locale and submitted form. */
export interface WebChannelInfo {
  deviceType: string | null;
  browser: string | null;
  country: string | null;
  language: string | null;
  formData: FormField[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

/**
 * Reads the web chat's data from an active session (unified-agent's webChannelData pipe and
 * customer-info panel). Returns null for sessions that are not web chats.
 */
export function readWebChannel(session: ChannelSession): WebChannelInfo | null {
  const attrs = session.channelData?.additionalAttributes ?? [];
  const raw = attrs.find((a) => a?.type?.toLowerCase() === "webchanneldata")?.value;
  const web = isRecord(session.webChannelData) ? session.webChannelData : isRecord(raw) ? raw : null;
  const formValue = isRecord(raw) && isRecord(raw.formData) ? raw.formData.attributes : undefined;
  const formData = Array.isArray(formValue)
    ? formValue.flatMap((item): FormField[] => {
        const key = isRecord(item) ? text(item.key) : null;
        return key ? [{ key, value: item.value }] : [];
      })
    : [];
  if (!web && formData.length === 0) return null;

  const device = isRecord(web?.browserDeviceInfo) ? web.browserDeviceInfo : {};
  const locale = isRecord(web?.locale) ? web.locale : {};
  return {
    deviceType: text(device.deviceType),
    browser: text(device.browserName),
    country: text(locale.country),
    language: text(locale.language),
    formData,
  };
}
