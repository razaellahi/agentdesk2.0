import { toBcp47 } from "./languages";
import { useLocaleStore } from "./localeStore";

function locale() {
  return toBcp47(useLocaleStore.getState().language);
}

function zone() {
  return useLocaleStore.getState().timezone;
}

const cache = new Map<string, Intl.DateTimeFormat>();

function dtf(options: Intl.DateTimeFormatOptions, timeZone = zone()) {
  const key = `${locale()}|${timeZone}|${JSON.stringify(options)}`;
  let fmt = cache.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.DateTimeFormat(locale(), { ...options, timeZone });
    } catch {
      fmt = new Intl.DateTimeFormat(locale(), options);
    }
    cache.set(key, fmt);
  }
  return fmt;
}

type DateInput = Date | string | number;
const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

/** Dates/times in the user's language and the tenant's timezone. */
export const formatDate = (v: DateInput) => dtf({ dateStyle: "medium" }).format(toDate(v));
export const formatTime = (v: DateInput) => dtf({ timeStyle: "short" }).format(toDate(v));
export const formatDateTime = (v: DateInput) =>
  dtf({ dateStyle: "medium", timeStyle: "short" }).format(toDate(v));

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale(), options).format(value);
}

/** 3725 -> "01:02:05"; under an hour -> "02:05". */
export function formatDuration(totalSeconds: number, alwaysHours = false): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 || alwaysHours ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatRelative(value: DateInput, now = Date.now()): string {
  const diff = (toDate(value).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}
