import { describe, expect, it } from "vitest";
import { unwrapList, unwrapTotal } from "./unwrap";

describe("unwrap", () => {
  it("reads a bare array or a known wrapper", () => {
    expect(unwrapList([1])).toEqual([1]);
    expect(unwrapList({ docs: ["a"] })).toEqual(["a"]);
    expect(unwrapList({ rules: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(unwrapList(null)).toEqual([]);
  });

  it("reads a total from the payload", () => {
    expect(unwrapTotal({ totalDocs: 12 }, 0)).toBe(12);
    expect(unwrapTotal([], 3)).toBe(3);
  });
});
