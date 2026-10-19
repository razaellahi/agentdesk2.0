import { describe, expect, it } from "vitest";
import { maskPii, piiAttribute } from "./pii";

const name = piiAttribute("firstName", null);
const phone = piiAttribute("phoneNumber", null);

describe("PII masking (unified-agent maskPIIAttribute pipe)", () => {
  it("shows the value with the screen's permission", () => {
    expect(maskPii("Amina", name, { full: true, masked: true })).toBe("Amina");
  });

  it("masks by schema type with masked_pii only", () => {
    expect(maskPii("Amina", name, { full: false, masked: true })).toBe("Ami**");
    expect(maskPii("+923001112233", phone, { full: false, masked: true })).toBe("***********33");
  });

  it("shows the value when neither permission is held, as the legacy pipe does", () => {
    expect(maskPii("Amina", name, { full: false, masked: false })).toBe("Amina");
  });
});
