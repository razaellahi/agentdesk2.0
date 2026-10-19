import { afterEach, describe, expect, it, vi } from "vitest";
import { vrsApi } from "@/core/api";
import { exportRecordings, searchRecordings } from "./api";
import { setConfig } from "@/config";
import { makeConfig } from "@/test/fixtures";
vi.mock("@/core/auth", () => ({
  can: () => true,
  getSession: () => ({ user: { id: "agent-1", username: "agent" } }),
}));
afterEach(() => vi.restoreAllMocks());
describe("complete recording export", () => {
  it("paginates legacy array tables while exporting every row", async () => {
    setConfig(makeConfig());
    vi.spyOn(vrsApi, "get").mockResolvedValue([
      { sessionId: "s1" },
      { sessionId: "s2" },
      { sessionId: "s3" },
    ]);
    const audit = vi.spyOn(vrsApi, "post").mockResolvedValue(undefined);
    expect(await searchRecordings({ offset: 2, pageSize: 2 })).toMatchObject({
      rows: [{ sessionId: "s3" }],
      total: 3,
    });
    expect((await exportRecordings({ offset: 2, pageSize: 2 })).map((row) => row.sessionId)).toEqual([
      "s1",
      "s2",
      "s3",
    ]);
    expect(audit).toHaveBeenCalledWith(
      "/vrs/audit-logs",
      expect.objectContaining({ status: "SUCCESS", action: "CSV_EXPORT" }),
      expect.anything(),
    );
  });
  it("fails and audits an export when the server repeats a page", async () => {
    setConfig(makeConfig());
    vi.spyOn(vrsApi, "get").mockResolvedValue({ docs: [{ sessionId: "s1" }], totalDocs: 2 });
    const audit = vi.spyOn(vrsApi, "post").mockResolvedValue(undefined);
    await expect(exportRecordings({})).rejects.toThrow("overlapping pages");
    expect(audit).toHaveBeenCalledWith(
      "/vrs/audit-logs",
      expect.objectContaining({ status: "FAILED" }),
      expect.anything(),
    );
  });
  it("traverses server pages using group count and preserves every correlated leg", async () => {
    setConfig(makeConfig());
    const get = vi
      .spyOn(vrsApi, "get")
      .mockResolvedValueOnce({
        docs: [{ callId: "g1", sessions: [{ sessionId: "s1" }, { sessionId: "s2" }] }],
        totalDocs: 2,
      })
      .mockResolvedValueOnce({ docs: [{ callId: "g2", sessions: [{ sessionId: "s3" }] }], totalDocs: 2 });
    vi.spyOn(vrsApi, "post").mockResolvedValue(undefined);
    expect((await exportRecordings({ customerNumber: "0300" })).map((row) => row.sessionId)).toEqual([
      "s1",
      "s2",
      "s3",
    ]);
    expect(get.mock.calls[1]?.[1]).toMatchObject({
      searchParams: { offset: 1, pageSize: 100, customerNumber: "0300" },
    });
  });
});
