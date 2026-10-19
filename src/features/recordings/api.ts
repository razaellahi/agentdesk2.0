import { getConfig } from "@/config";
import { can, getSession } from "@/core/auth";
import { vrsApi } from "@/core/api";
import { unwrapList, unwrapTotal } from "@/shared/lib/unwrap";

export interface Recording extends Partial<
  Record<`callVariable${number}` | `call_variable${number}`, string | null>
> {
  callId?: string | number;
  correlationId?: string | null;
  sessions?: Recording[];
  tagId?: number | null;
  tagName?: string | null;
  sessionId?: string;
  id?: string;
  callingPhoneNumber?: string;
  calledPhoneNumber?: string;
  customerNumber?: string;
  agentExtension?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  screenRecordingUrl?: string;
  wrapupCode?: string;

  callingNumber?: string;
  calledNumber?: string;
  agentId?: string;
  agentName?: string;
  duration?: number | string;
  holdTime?: number | string;
  startTime?: string;
  endTime?: string;
  queueName?: string;
  wrapupCodes?: string | string[];
  wrapUpCodes?: string | string[];
  direction?: string;
  callDirection?: string;
  downloadUrl?: string;
  lastPlayedBy?: string;
  isArchived?: boolean;
  tag?: string;
  tags?: string[];
}

export interface RecordingSearch {
  startTime?: string;
  endTime?: string;
  tagId?: number;
  tagName?: string;
  agentId?: string;
  AgentName?: string;
  customerNumber?: string;
  agentExtension?: string;
  duration?: string;
  holdTime?: string;
  wrapupCodes?: string;
  direction?: string;
  callVariableKey?: string;
  callVariableValue?: string;
  offset?: number;
  pageSize?: number;
}

export interface AuditLog {
  id: number;
  username?: string;
  action?: string;
  resource_id?: string;
  status?: string;
  timestamp?: number;
  ip_address?: string;
}

export interface RecordingRule {
  id: number;
  ruleAction?: string;
  ruleType?: string;
  mask?: string;
  priority?: number;
  fromTime?: string;
  toTime?: string;
  sun?: boolean;
  mon?: boolean;
  tue?: boolean;
  wed?: boolean;
  thu?: boolean;
  fri?: boolean;
  sat?: boolean;
  screenCapture?: boolean;
  screenCaptureUsage?: number;
}

export interface ArchivalSettings {
  id: number;
  tenantId?: string;
  isArchiveEnabled: boolean;
  externalServerIp: string;
  folderPath: string;
  username: string;
  password: string;
  archiveMode: string;
  retentionDays: number;
  copyTime?: string;
}

export interface Tag {
  id: number;
  name: string;
}

export const DURATION_OPTIONS = [
  "00:00:30",
  "00:01:00",
  "00:01:30",
  "00:02:00",
  "00:02:30",
  "00:03:00",
  "00:05:00",
  "00:10:00",
  "00:15:00",
  "00:30:00",
  "01:00:00",
];

export const DATE_WITHIN = [
  { value: "", labelKey: "recordings.date-within" },
  { value: "7", label: "7 Days" },
  { value: "15", label: "15 Days" },
  { value: "30", label: "1 Month" },
  { value: "90", label: "3 Months" },
] as const;

export const CALL_VARIABLES = Array.from({ length: 10 }, (_, i) => `call_variable${i + 1}`);

function opts() {
  return { tenantHeader: getConfig().VRS_TENANT_HEADER };
}

export function dayRange(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return {
    startTime: `${day} 00:00:00`,
    endTime: `${day} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  };
}

/** Date Within presets from VRS develop (`dateRangeRecord`). */
export function dateWithinRange(days: number, now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  const fmt = (d: Date, time: string) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`;
  return { startTime: fmt(start, "00:00:00"), endTime: fmt(end, "23:59:59") };
}

/** Maps UI filters to VRS query params (UA/VRS `buildSearchParams`). */
export function buildRecordingParams(input: RecordingSearch): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  const set = (key: string, value: unknown) => {
    if (value === "" || value == null) return;
    params[key] = typeof value === "number" ? value : String(value).trim();
  };
  set("startTime", input.startTime);
  set("endTime", input.endTime);
  set("agentId", input.agentId);
  set("AgentName", input.AgentName);
  set("customerNumber", input.customerNumber);
  set("agentExtension", input.agentExtension);
  set("duration", input.duration);
  set("holdTime", input.holdTime);
  set("wrapupCodes", input.wrapupCodes);
  set("direction", input.direction);
  set("tagId", input.tagId);
  set("tagName", input.tagName);
  if (input.callVariableKey && input.callVariableValue) {
    set("callVariableKey", input.callVariableKey);
    set("callVariableValue", input.callVariableValue);
  }
  if (typeof input.offset === "number") params.offset = input.offset;
  if (typeof input.pageSize === "number") params.pageSize = input.pageSize;
  return params;
}

export function wrapupText(row: Recording) {
  const value = row.wrapupCodes ?? row.wrapUpCodes ?? row.wrapupCode;
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(", ") || "—";
  if (value == null || value === "") return "—";
  return String(value);
}

export async function searchRecordings(input: RecordingSearch, allUnpaged = false) {
  const body = await vrsApi.get("/vrs/recordings", {
    ...opts(),
    searchParams: buildRecordingParams(input),
  });
  const allGroups = unwrapList<Recording>(body);
  const unpaged = Array.isArray(body);
  const groups =
    unpaged && !allUnpaged
      ? allGroups.slice(input.offset ?? 0, (input.offset ?? 0) + (input.pageSize ?? 25))
      : allGroups;
  const rows = flattenRecordings(groups);
  return { rows, total: unwrapTotal(body, allGroups.length), groupCount: groups.length, unpaged };
}

/** Normalize both deployed session shapes without dropping the parent tag/correlation. */
export function flattenRecordings(groups: Recording[]): Recording[] {
  const normalize = (row: Recording): Recording => ({
    ...row,
    sessionId: row.sessionId ?? row.id,
    callingNumber: row.callingNumber ?? row.callingPhoneNumber ?? row.customerNumber,
    calledNumber: row.calledNumber ?? row.calledPhoneNumber ?? row.agentExtension,
    startTime: row.startTime ?? row.sessionStartTime,
    endTime: row.endTime ?? row.sessionEndTime,
    downloadUrl:
      row.downloadUrl ??
      (row.sessionId || row.id
        ? `/vrs/recording/download/${encodeURIComponent(row.sessionId ?? row.id!)}`
        : undefined),
  });
  return groups.flatMap((parent) =>
    parent.sessions?.length
      ? parent.sessions.map((session) =>
          normalize({
            ...parent,
            ...session,
            sessions: undefined,
            correlationId:
              parent.callId != null && String(parent.callId) !== "0" ? String(parent.callId) : null,
          }),
        )
      : [normalize(parent)],
  );
}
function requirePermission(permission: Parameters<typeof can>[0]) {
  if (!can(permission)) throw new Error("You do not have permission for this action.");
}
export function assignRecordingTag(recording: Recording, tagId: number | null) {
  requirePermission("recordingTagsAssign");
  return vrsApi.put(
    "/vrs/recordings/tag",
    {
      correlationId: recording.correlationId ?? null,
      callId: recording.callId != null ? String(recording.callId) : (recording.sessionId ?? null),
      tagId,
    },
    opts(),
    "text",
  );
}
export function updateTag(tag: Tag) {
  requirePermission("recordingTagsManage");
  return vrsApi.put(`/vrs/tags/${tag.id}`, tag, opts(), "text");
}
export function updateRule(rule: RecordingRule) {
  requirePermission("recordingsManage");
  return vrsApi.put(`/vrs/recording-rules/${rule.id}`, rule, opts(), "text");
}
export async function exportRecordings(input: RecordingSearch) {
  requirePermission("recordingsExport");
  try {
    const { offset: _offset, pageSize: _size, ...filters } = input;
    const result = await searchRecordings({ ...filters, offset: 0, pageSize: 100 }, true);
    const rows = [...result.rows];
    const seen = new Set(rows.map((row) => row.sessionId ?? row.callId).filter((id) => id != null));
    let offset = result.groupCount;
    while (!result.unpaged && offset < result.total) {
      const next = await searchRecordings({ ...filters, offset, pageSize: 100 });
      if (!next.groupCount)
        throw new Error("Recording export ended before all records were returned. Retry the export.");
      for (const row of next.rows) {
        const id = row.sessionId ?? row.callId;
        if (id == null || seen.has(id))
          throw new Error("Recording export returned overlapping pages. Retry the export.");
        seen.add(id);
      }
      rows.push(...next.rows);
      offset += next.groupCount;
    }
    await vrsApi.post(
      "/vrs/audit-logs",
      { username: getSession().user?.username, action: "CSV_EXPORT", status: "SUCCESS" },
      opts(),
    );
    return rows;
  } catch (error) {
    await vrsApi
      .post(
        "/vrs/audit-logs",
        { username: getSession().user?.username, action: "CSV_EXPORT", status: "FAILED" },
        opts(),
      )
      .catch(() => {});
    throw error;
  }
}

export function logPlay(sessionId: string, username: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const datetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return vrsApi.post(
    `/vrs/recording/${sessionId}/logAction`,
    { username, action: "PLAY", datetime },
    opts(),
    "text",
  );
}

/** Rewrites stored download hosts to the configured VRS origin (VRS develop getDownloadUrl). */
export function resolveRecordingUrl(
  downloadUrl: string,
  username: string,
  action = "PLAY",
  format?: "wav" | "mp3",
) {
  const base = (getConfig().VRS_URL || "").replace(/\/+$/, "");
  const parsed = new URL(
    downloadUrl,
    new URL(`${base || globalThis.location.origin}/`, globalThis.location.origin),
  );
  let path = parsed.pathname;
  if (path.startsWith("/recording/") || path.startsWith("/stream/")) path = `/vrs${path}`;
  if (!path.startsWith("/vrs/recording/") && !path.startsWith("/vrs/stream/"))
    throw new Error("Unsupported recording URL.");
  // Stored hosts can be obsolete. Never send identity credentials to them.
  const url = `${base}${path}${parsed.search}`;
  const query = new URLSearchParams({ username, action });
  if (format === "mp3") query.set("outputFormat", "mp3");
  return `${url}${url.includes("?") ? "&" : "?"}${query.toString()}`;
}

export async function fetchRecordingAudio(
  url: string,
  username: string,
  action = "PLAY",
  format?: "wav" | "mp3",
) {
  requirePermission(action === "DOWNLOAD" ? "recordingsDownload" : "recordings");
  return vrsApi.get<Blob>(resolveRecordingUrl(url, username, action, format), opts(), "blob");
}

export async function listAuditLogs(filters: Record<string, string | number> = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value !== "")
      .map(([key, value]) => [
        key,
        typeof value === "string" && key.endsWith("Date") ? value.replace("T", " ") : value,
      ]),
  );
  const body = await vrsApi.get("/vrs/audit-logs", { ...opts(), searchParams: cleaned });
  const rows = unwrapList<AuditLog>(body);
  return { rows, total: unwrapTotal(body, rows.length) };
}

export async function listRules() {
  const rules: RecordingRule[] = [];
  let offset = 0;
  while (true) {
    const body = await vrsApi.get("/vrs/recording-rules", {
      ...opts(),
      searchParams: { offset, pageSize: 100 },
    });
    const page = unwrapList<RecordingRule>(body);
    // Legacy servers return the whole list and ignore paging.
    const fresh = page.filter((rule) => !rules.some((existing) => existing.id === rule.id));
    rules.push(...fresh);
    offset += page.length;
    if (!fresh.length || page.length < 100 || offset >= unwrapTotal(body, offset)) break;
  }
  return rules;
}

export function getArchival(tenantId?: string) {
  return vrsApi.get<ArchivalSettings>("/vrs/archival-setting", {
    ...opts(),
    searchParams: tenantId ? { tenantId } : undefined,
  });
}

export function saveArchival(settings: ArchivalSettings) {
  requirePermission("recordingsManage");
  const { id, copyTime, ...rest } = settings;
  const payload = { ...rest, ...(settings.archiveMode === "copy_and_archive" ? { copyTime } : {}) };
  return id
    ? vrsApi.put(`/vrs/archival-setting/${id}`, payload, opts(), "text")
    : vrsApi.post<ArchivalSettings>("/vrs/archival-setting", payload, opts());
}

export async function listTags() {
  return unwrapList<Tag>(await vrsApi.get("/vrs/tags", opts()));
}

export function createTag(name: string) {
  requirePermission("recordingTagsManage");
  return vrsApi.post("/vrs/tags", { name }, opts());
}

export function deleteTag(id: number) {
  requirePermission("recordingTagsManage");
  return vrsApi.delete(`/vrs/tags/${id}`, opts(), "text");
}

export function saveRulePriorities(rules: { id: number; priority: number }[]) {
  requirePermission("recordingsManage");
  return vrsApi.put("/vrs/recording-rules/priority", rules, opts(), "text");
}

export function createRule(rule: Omit<RecordingRule, "id" | "priority">) {
  requirePermission("recordingsManage");
  const { id: _id, priority: _priority, ...payload } = rule as RecordingRule;
  return vrsApi.post("/vrs/recording-rules", payload, opts());
}

export function deleteRule(id: number) {
  requirePermission("recordingsManage");
  return vrsApi.delete(`/vrs/recording-rules/${id}`, opts(), "text");
}

export function logDownload(sessionId: string, username: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const datetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return vrsApi.post(
    `/vrs/recording/${sessionId}/logAction`,
    { username, action: "DOWNLOAD", datetime },
    opts(),
    "text",
  );
}
