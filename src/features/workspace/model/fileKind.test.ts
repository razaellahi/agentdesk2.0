import { describe, expect, it } from "vitest";
import { fileKind, fileSize } from "./fileKind";

describe("fileKind", () => {
  it("names the extension in capitals and picks a colour for the family", () => {
    expect(fileKind("Invoice-1042.pdf").ext).toBe("PDF");
    expect(fileKind("Invoice-1042.pdf").tile).toContain("red");
    expect(fileKind("report.final.XLSX").ext).toBe("XLSX");
    expect(fileKind("report.final.XLSX").tile).toContain("emerald");
    expect(fileKind("photos.zip").tile).toContain("amber");
  });

  it("falls back to a plain file for an unknown or missing extension", () => {
    expect(fileKind("README").ext).toBe("");
    expect(fileKind("data.xyz").tile).toContain("slate");
    expect(fileKind(undefined).ext).toBe("");
  });
});

describe("fileSize", () => {
  it("reads in bytes, kilobytes and megabytes", () => {
    expect(fileSize(512)).toBe("512 B");
    expect(fileSize(86_016)).toBe("84 KB");
    expect(fileSize(3 * 1024 * 1024 + 200_000)).toBe("3.2 MB");
    expect(fileSize(undefined)).toBe("");
  });
});
