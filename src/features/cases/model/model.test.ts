import { describe, expect, it } from "vitest";
import type { Case, CaseAuditEntry } from "../api/types";
import { formatHistorySummary, historyTimelineDot, isVisibleHistoryEntry } from "./activityFormat";
import {
  interactionHref,
  isInteractionUrl,
  pickInteractionIdForApi,
  resolveSlaTierFromLabels,
  cimCustomerDisplayName,
} from "./customer";
import { parseDrill, workbenchLink } from "./drill";
import {
  attachmentPreviewKind,
  formatCommentBody,
  formatDueIn,
  formatMinutes,
  priorityCode,
  resolutionShort,
  routingLabel,
  slaTone,
  statusTone,
} from "./format";
import { policyFieldValid } from "./policy";
import { InvalidRangeError, customRange, presetRange } from "./reportRange";
import { resolveGroupOptionValue } from "./routing";
import {
  caseAbilities,
  defaultFiltersForView,
  filterWorkbenchCases,
  type WorkbenchFilters,
} from "./workbench";

const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${JSON.stringify(options)}` : key;

function makeCase(patch: Partial<Case> = {}): Case {
  return {
    id: "c1",
    caseReferenceId: "CASE-20261019-00001",
    title: "Title",
    description: null,
    priority: "Medium",
    customerProfileId: null,
    categoryId: null,
    subCategoryId: null,
    category: null,
    subCategory: null,
    assignedGroupId: "billing",
    assignedUserId: null,
    createdByUserId: "u1",
    resolutionDueAt: null,
    slaState: "OK",
    slaMinutesRemaining: null,
    slaTimeLabel: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
    status: { id: "s", code: "IN_PROGRESS", label: "In progress", statusCategory: "OPEN" },
    conversations: [],
    attachments: [],
    comments: [],
    ...patch,
  };
}

describe("badges", () => {
  it("maps priorities to P1–P4 including numeric and P-codes", () => {
    expect(["Critical", "high", "P3", "4", "unknown"].map(priorityCode)).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "P3",
    ]);
  });

  it("colours statuses by category and falls back to the code for custom statuses", () => {
    expect(statusTone("PENDING", "X")).toBe("pending");
    expect(statusTone(null, "WAITING_PENDING_VENDOR")).toBe("pending");
    expect(statusTone(undefined, "ARCHIVED")).toBe("open");
  });

  it("lets a paused clock win over the SLA state and treats overdue labels as breached", () => {
    expect(slaTone({ slaState: "BREACHED", slaPausedAt: "2026-01-01" })).toBe("paused");
    expect(slaTone({ slaState: "OK", slaTimeLabel: "Overdue 5m" })).toBe("breached");
    expect(slaTone({ slaState: "OK", slaMinutesRemaining: 0 })).toBe("breached");
    expect(slaTone({ slaState: "WARNING" })).toBe("warning");
  });

  it("formats durations, routing labels, mentions and preview kinds", () => {
    expect(formatMinutes(135)).toBe("2h 15m");
    expect(formatDueIn("2026-10-19T10:30:00Z", Date.parse("2026-10-19T10:00:00Z"))).toBe("30m");
    expect(formatDueIn("2026-10-19T09:00:00Z", Date.parse("2026-10-19T10:00:00Z"))).toBeNull();
    expect(routingLabel("case-routing-billing-team")).toBe("Billing Team");
    expect(formatCommentBody("Hi @[Sana Iqbal](u-1) and @[Billing](group:billing)")).toBe(
      "Hi @Sana Iqbal and @Billing",
    );
    expect(attachmentPreviewKind({ mimeType: null, fileName: "a.PDF" })).toBe("pdf");
    expect(attachmentPreviewKind({ mimeType: "image/png", fileName: "x" })).toBe("image");
    expect(resolutionShort(2880)).toBe("2d");
    expect(resolutionShort(0)).toBeNull();
  });
});

describe("drill links", () => {
  it("serialises only the keys that are set", () => {
    expect(workbenchLink({ listView: "all", group: "billing", caseId: "" })).toBe(
      "/cases?listView=all&group=billing",
    );
    expect(workbenchLink({})).toBe("/cases");
  });

  it("parses dashboard drill parameters into workbench filters", () => {
    const state = parseDrill(
      new URLSearchParams("listView=all&priority=high,critical&assignee=u-1&createdSince=today"),
    )!;
    expect(state.listView).toBe("all");
    expect([...state.priorities!]).toEqual(["HIGH", "CRITICAL"]);
    expect(state.assigneeUserId).toBe("u-1");
    expect(state.createdSince?.getUTCHours()).toBe(0);
    expect(parseDrill(new URLSearchParams("sla=breached"))!.listView).toBe("breached");
    expect(parseDrill(new URLSearchParams("caseId=x"))).toBeNull();
  });
});

describe("report ranges", () => {
  it("covers whole UTC days for presets and custom ranges", () => {
    const range = presetRange(7, new Date("2026-10-19T15:00:00Z"));
    expect(range).toEqual({ dateFrom: "2026-10-13T00:00:00.000Z", dateTo: "2026-10-19T23:59:59.999Z" });
    expect(customRange("2026-10-01", "2026-10-02").dateTo).toBe("2026-10-02T23:59:59.999Z");
  });

  it("rejects reversed and invalid custom ranges", () => {
    expect(() => customRange("2026-10-05", "2026-10-01")).toThrow(InvalidRangeError);
    expect(() => customRange("nope", "2026-10-01")).toThrow(InvalidRangeError);
  });
});

describe("customer and interactions", () => {
  it("only sends a single non-URL interaction reference as the interaction id", () => {
    expect(pickInteractionIdForApi(["64f1a2b3c4d5e6f7", "https://crm.example.com/t/1"])).toBe(
      "64f1a2b3c4d5e6f7",
    );
    expect(pickInteractionIdForApi(["conv-1", "conv-2"])).toBeNull();
    expect(isInteractionUrl("www.example.com/ticket")).toBe(true);
    // A bare id is a reference, not a link (the source treated it as a URL and never sent it).
    expect(isInteractionUrl("conv-1")).toBe(false);
    expect(interactionHref("example.com/x")).toBe("https://example.com/x");
  });

  it("picks the SLA tier from the customer's labels, preferring configured tiers", () => {
    const catalog = [
      { _id: "l1", name: "Gold" },
      { _id: "l2", name: "VIP" },
    ];
    expect(resolveSlaTierFromLabels(["l1", "l2"], catalog, ["vip"])).toBe("VIP");
    expect(resolveSlaTierFromLabels(["l1"], catalog, ["vip"])).toBe("Gold");
    expect(resolveSlaTierFromLabels([], catalog, ["vip"])).toBeNull();
    expect(cimCustomerDisplayName({ _id: "x", phoneNumber: ["", "+92300"] })).toBe("+92300");
  });
});

describe("history summaries", () => {
  const entry = (patch: Partial<CaseAuditEntry>): CaseAuditEntry => ({
    id: "a",
    caseId: "c",
    action: "CASE_STATUS_CHANGED",
    actionLabel: "status changed",
    performedBy: "u1",
    createdAt: "2026-10-19T08:00:00Z",
    changes: [],
    summary: null,
    ...patch,
  });

  it("hides comment bookkeeping and keeps lifecycle actions", () => {
    expect(isVisibleHistoryEntry(entry({ action: "COMMENT_CREATED" }))).toBe(false);
    expect(isVisibleHistoryEntry(entry({ action: "CASE_CLAIMED" }))).toBe(true);
    expect(
      isVisibleHistoryEntry(
        entry({
          action: "FIELD",
          changes: [{ field: "internal", fieldLabel: "x", fromValue: null, toValue: "y" }],
        }),
      ),
    ).toBe(false);
  });

  it("summarises status changes and auto-assignment", () => {
    const status = entry({
      changes: [{ field: "statusCode", fieldLabel: "Status", fromValue: "NEW", toValue: "IN_PROGRESS" }],
    });
    expect(
      formatHistorySummary(status, (id) => id, t)
        .map((p) => p.text)
        .join(""),
    ).toBe("cases.history.status-changedcases.status.new → cases.status.in-progress");
    expect(historyTimelineDot(status)).toBe("status");
    const auto = entry({
      action: "CASE_AUTO_ASSIGNED",
      changes: [{ field: "assignedUserId", fieldLabel: "Assignee", fromValue: null, toValue: "u9" }],
    });
    expect(formatHistorySummary(auto, () => "Sana", t)).toEqual([
      { text: "cases.history.auto-assigned-to", tone: "plain" },
      { text: "Sana", tone: "emphasis" },
    ]);
  });
});

describe("workbench filtering", () => {
  const base = (view: WorkbenchFilters["listView"]): WorkbenchFilters => ({
    listView: view,
    group: null,
    priorities: new Set(),
    assigneeUserId: null,
    slaDueSoonOnly: false,
    createdSince: null,
    sortBySla: false,
    ...defaultFiltersForView(view),
  });

  it("applies list-view defaults (unassigned pool, my open cases, closed work)", () => {
    const rows = [
      makeCase({ id: "a", status: { id: "1", code: "NEW", label: "New" } }),
      makeCase({ id: "b", assignedUserId: "me" }),
      makeCase({ id: "c", status: { id: "2", code: "CLOSED", label: "Closed", statusCategory: "CLOSED" } }),
    ];
    expect(filterWorkbenchCases(rows, base("unassigned"), "me").map((c) => c.id)).toEqual(["a"]);
    expect(filterWorkbenchCases(rows, base("my"), "me").map((c) => c.id)).toEqual(["b"]);
    expect(filterWorkbenchCases(rows, base("closed"), "me").map((c) => c.id)).toEqual(["c"]);
  });

  it("sorts by due date then SLA severity and filters due-soon", () => {
    const now = Date.parse("2026-10-19T10:00:00Z");
    const rows = [
      makeCase({ id: "late", resolutionDueAt: "2026-10-19T15:00:00Z" }),
      makeCase({ id: "soon", resolutionDueAt: "2026-10-19T11:00:00Z" }),
      makeCase({ id: "none" }),
    ];
    const sorted = filterWorkbenchCases(rows, { ...base("all"), sortBySla: true }, null, now);
    expect(sorted.map((c) => c.id)).toEqual(["soon", "late", "none"]);
    expect(
      filterWorkbenchCases(rows, { ...base("all"), slaDueSoonOnly: true }, null, now).map((c) => c.id),
    ).toEqual(["soon"]);
  });

  it("derives in-page abilities from backend roles", () => {
    const agent = caseAbilities(["case-backoffice-member"], "me");
    expect(agent.reassign).toBe(false);
    expect(agent.manageLifecycle({ assignedUserId: "me" })).toBe(true);
    expect(agent.deleteComment("someone")).toBe(false);
    const manager = caseAbilities(["CASE-BACKOFFICE-MANAGER"], "me");
    expect(manager.reassign && manager.groupScopedSupervisor).toBe(true);
    expect(caseAbilities(["case-admin"], "me").groupScopedSupervisor).toBe(false);
  });
});

describe("admin helpers", () => {
  it("matches stored routing keys to Keycloak group options", () => {
    const groups = [{ id: "kc-1", name: "Billing Team" }];
    expect(resolveGroupOptionValue("billing-team", groups)).toBe("billing-team");
    expect(resolveGroupOptionValue("kc-1", groups)).toBe("billing-team");
    expect(resolveGroupOptionValue("/Billing Team", groups)).toBe("billing-team");
    expect(resolveGroupOptionValue("unknown", groups)).toBe("unknown");
  });

  it("bounds the tenant policy fields", () => {
    expect(policyFieldValid("auditRetentionDays", 29)).toBe(false);
    expect(policyFieldValid("dashboardRefreshSeconds", 300)).toBe(true);
    expect(policyFieldValid("reopenDays", Number.NaN)).toBe(false);
  });
});
