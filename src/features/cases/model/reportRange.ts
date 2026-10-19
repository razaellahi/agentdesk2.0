import type { ReportFilter } from "../api/types";

/** Report/dashboard periods (report-workbench-links.ts). Ranges are whole UTC days. */
export type ReportPresetDays = 7 | 30 | 90;

/** YYYY-MM-DD for <input type="date"> (UTC calendar day). */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function defaultCustomRange(now = new Date()): { from: string; to: string } {
  const dateFrom = new Date(now);
  dateFrom.setUTCDate(dateFrom.getUTCDate() - 29);
  return { from: toDateInputValue(dateFrom), to: toDateInputValue(now) };
}

export function presetRange(days: ReportPresetDays, now = new Date()): ReportFilter {
  const dateTo = new Date(now);
  dateTo.setUTCHours(23, 59, 59, 999);
  const dateFrom = new Date(dateTo);
  dateFrom.setUTCDate(dateFrom.getUTCDate() - (days - 1));
  dateFrom.setUTCHours(0, 0, 0, 0);
  return { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() };
}

export class InvalidRangeError extends Error {
  constructor(readonly reason: "invalid" | "order") {
    super(reason === "order" ? "Start date must be on or before end date" : "Invalid date");
  }
}

/** Inclusive custom range from date inputs; throws InvalidRangeError. */
export function customRange(fromInput: string, toInput: string): ReportFilter {
  const dateFrom = new Date(`${fromInput}T00:00:00.000Z`);
  const dateTo = new Date(`${toInput}T23:59:59.999Z`);
  if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime()))
    throw new InvalidRangeError("invalid");
  if (dateFrom > dateTo) throw new InvalidRangeError("order");
  return { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() };
}

export type Period =
  | { kind: "live" }
  | { kind: "preset"; days: ReportPresetDays }
  | { kind: "custom"; from: string; to: string };

export function periodFilter(period: Period): ReportFilter | null {
  if (period.kind === "live") return null;
  if (period.kind === "preset") return presetRange(period.days);
  return customRange(period.from, period.to);
}
