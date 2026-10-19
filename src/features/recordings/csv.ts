import { wrapupText, type Recording } from "./api";
const text = (value: unknown) => (value == null || value === "" ? "N/A" : String(value));
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
const safeText = (value: unknown) => {
  const s = text(value);
  return /^[\s]*[=+\-@]/.test(s) ? `'${s}` : s;
};
// Preserve leading zeroes in spreadsheets; only a validated phone literal uses a formula.
const phone = (value: unknown) =>
  /^[+\d ()-]+$/.test(String(value ?? "")) ? `="${String(value).trim()}"` : safeText(value);
function duration(value: number | string | undefined, start?: string, end?: string) {
  if (typeof value === "string" && /^\d+:\d{2}:\d{2}$/.test(value)) return value;
  const seconds =
    value != null && value !== ""
      ? Number(value)
      : start && end
        ? (Date.parse(end.replace(" ", "T")) - Date.parse(start.replace(" ", "T"))) / 1000
        : NaN;
  if (!Number.isFinite(seconds) || seconds < 0) return "N/A";
  const n = Math.floor(seconds);
  return [Math.floor(n / 3600), Math.floor(n / 60) % 60, n % 60]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}
export function recordingCsv(rows: Recording[], profile: string) {
  const headers = [
    "Call ID",
    "Calling Number",
    "Called Number",
    "Agent ID",
    "Agent Name",
    "Date (YYYY-MM-DD)",
    "Start Time",
    "End Time",
    "Call Duration",
    ...(profile === "EFCX"
      ? ["Queue Name", "Hold Time", "Wrapup Codes"]
      : profile === "CISCO"
        ? ["Call Direction", "Wrapup Codes", "Tag"]
        : []),
  ];
  const records = rows.map((row) => [
    safeText(row.correlationId ?? row.callId ?? row.sessionId),
    phone(row.callingNumber),
    phone(row.calledNumber),
    safeText(row.agentId),
    safeText(row.agentName),
    text(row.startTime?.slice(0, 10)),
    text(row.startTime),
    text(row.endTime),
    duration(row.duration, row.startTime, row.endTime),
    ...(profile === "EFCX"
      ? [safeText(row.queueName), duration(row.holdTime), safeText(wrapupText(row))]
      : profile === "CISCO"
        ? [safeText(row.direction ?? row.callDirection), safeText(wrapupText(row)), safeText(row.tagName)]
        : []),
  ]);
  return `\uFEFF${[headers, ...records].map((row) => row.map(quote).join(",")).join("\n")}`;
}
