import { describe, expect, it } from "vitest";
import { toRules, unmetRules } from "./passwordPolicy";

const policies = [
  { type: "length", value: "8" },
  { type: "upperCase", value: "1" },
  { type: "digits", value: "2" },
  { type: "specialChars", value: "0" },
  { type: "notUsername", value: "" },
  { type: "passwordHistory", value: "3" },
  { type: "hashIterations", value: "27500" },
];

describe("password policy rules", () => {
  it("maps known policies, skips zero-valued and backend-only ones", () => {
    expect(toRules(policies).map((r) => r.type)).toEqual([
      "length",
      "upperCase",
      "digits",
      "notUsername",
      "passwordHistory",
    ]);
  });

  it("reports unmet client-checkable rules only", () => {
    const rules = toRules(policies);
    expect(unmetRules(rules, "agent007", "agent007").map((r) => r.type)).toEqual([
      "upperCase",
      "notUsername",
    ]);
    expect(unmetRules(rules, "Str0ngPass1", "agent")).toEqual([]);
  });
});
