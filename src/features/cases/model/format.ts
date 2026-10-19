/** Display helpers shared by case screens (case-console ui/*-badge + workbench/dashboard helpers). */

export type PriorityLevel = "critical" | "high" | "medium" | "low";
export type StatusTone = "open" | "pending" | "resolved" | "closed";
export type SlaTone = "ok" | "warning" | "breached" | "paused";

export const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;

export const CLOSED_STATUS_CODES = ["RESOLVED", "CLOSED"] as const;
export const OPEN_STATUS_CODES = [
  "NEW",
  "UNASSIGNED",
  "IN_PROGRESS",
  "PENDING_CUSTOMER",
  "PENDING_INTERNAL",
] as const;
export const CLOSED_STATUS_SET = new Set<string>(CLOSED_STATUS_CODES);
export const OPEN_STATUS_SET = new Set<string>(OPEN_STATUS_CODES);

export function priorityLevel(priority: string): PriorityLevel {
  const p = priority.toLowerCase();
  if (p === "critical" || p === "p1" || p === "1") return "critical";
  if (p === "high" || p === "p2" || p === "2") return "high";
  if (p === "low" || p === "p4" || p === "4") return "low";
  return "medium";
}

export function priorityLabel(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
}

export function priorityCode(priority: string): "P1" | "P2" | "P3" | "P4" {
  switch (priorityLevel(priority)) {
    case "critical":
      return "P1";
    case "high":
      return "P2";
    case "medium":
      return "P3";
    default:
      return "P4";
  }
}

const KNOWN_CATEGORIES = new Set(["OPEN", "PENDING", "RESOLVED", "CLOSED"]);

/** Status colour from statusCategory, falling back to the code (custom statuses still render). */
export function statusTone(category: string | null | undefined, code: string, label = ""): StatusTone {
  const upper = category?.toUpperCase();
  if (upper && KNOWN_CATEGORIES.has(upper)) return upper.toLowerCase() as StatusTone;
  const value = (code || label).toLowerCase();
  if (value.includes("pending")) return "pending";
  if (value.includes("resolved")) return "resolved";
  if (value.includes("closed")) return "closed";
  return "open";
}

/** slaPausedAt overrides slaState: the clock is not moving while paused. */
export function slaTone(input: {
  slaState?: string | null;
  slaTimeLabel?: string | null;
  slaMinutesRemaining?: number | null;
  slaPausedAt?: string | null;
}): SlaTone {
  if (input.slaPausedAt) return "paused";
  const minutes = input.slaMinutesRemaining;
  if (minutes != null && minutes <= 0) return "breached";
  if ((input.slaTimeLabel ?? "").toLowerCase().startsWith("overdue")) return "breached";
  const state = input.slaState?.toUpperCase();
  if (state === "BREACHED") return "breached";
  if (state === "WARNING") return "warning";
  return "ok";
}

export function slaVisible(input: {
  slaState?: string | null;
  slaTimeLabel?: string | null;
  slaPausedAt?: string | null;
}) {
  return Boolean(input.slaPausedAt) || Boolean(input.slaState && input.slaTimeLabel);
}

export function isOpenCase(c: { status: { code: string; statusCategory?: string | null } }): boolean {
  const category = c.status.statusCategory?.toUpperCase();
  if (category === "OPEN" || category === "PENDING") return true;
  return !CLOSED_STATUS_SET.has(c.status.code) && category !== "RESOLVED" && category !== "CLOSED";
}

export function isActiveCase(c: { status: { code: string } }): boolean {
  return c.status.code !== "RESOLVED" && c.status.code !== "CLOSED";
}

export function normalizeGroupKey(value: string): string {
  return value.replace(/^\//, "").trim().toLowerCase();
}

export function formatGroupLabel(value: string): string {
  const key = normalizeGroupKey(value);
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Case detail routing label: case-routing-billing-team -> "Billing Team". */
export function routingLabel(groupId: string | null): string | null {
  if (!groupId) return null;
  return groupId
    .replace(/^case-routing-/i, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Keycloak group name -> routing slug (admin mapping + reassign dialog). */
export function groupSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function formatDueIn(iso: string, now = Date.now()): string | null {
  const dueMs = new Date(iso).getTime() - now;
  if (dueMs <= 0) return null;
  return formatMinutes(Math.ceil(dueMs / 60_000));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Mention tokens are stored as @[Label](id); show @Label. */
export function formatCommentBody(body: string): string {
  return body.trim().replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");
}

export function truncate(text: string, max = 280): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

export function slaSortRank(state: string | null | undefined): number {
  switch (state?.toUpperCase()) {
    case "BREACHED":
      return 3;
    case "WARNING":
      return 2;
    case "OK":
      return 1;
    default:
      return 0;
  }
}

/** File Engine preview kinds (case-console file-download.service.ts). */
export function attachmentPreviewKind(attachment: { mimeType: string | null; fileName: string }) {
  const mime = attachment.mimeType?.toLowerCase() ?? "";
  const ext = attachment.fileName.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("text/") || ["txt", "log", "csv", "json", "md", "rtf"].includes(ext)) return "text";
  return "none";
}

export const TEXT_PREVIEW_MAX_BYTES = 512 * 1024;

/** 90 -> "2h", 2880 -> "2d"; null when the value cannot be a resolution window. */
export function resolutionShort(minutes: number): string | null {
  if (!minutes || minutes < 1) return null;
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / (24 * 60))}d`;
}

/** Keycloak directory user label: display name, then username, then id. */
export function directoryName(user: {
  userId: string;
  username: string | null;
  displayName: string | null;
}): string {
  return user.displayName?.trim() || user.username?.trim() || user.userId;
}
