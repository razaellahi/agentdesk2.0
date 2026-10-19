import { describe, expect, it } from "vitest";
import { maskError } from "./mask";

describe("recording mask", () => {
  it("accepts the VRS patterns", () => {
    for (const mask of ["123", "*123*", "123?", ">2005", "2005>", "2005=2006", "*"]) {
      expect(maskError(mask)).toBeNull();
    }
  });

  it("rejects letters and mixed specials", () => {
    expect(maskError("")).toBe("empty");
    expect(maskError("12a")).toBe("letters");
    expect(maskError("1*2?")).toBe("pattern");
  });
});
