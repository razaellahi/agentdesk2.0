import { describe, expect, it } from "vitest";
import { validateAttribute } from "./attributeValidation";
describe("source customer schema validation", () => {
  it("preserves required, regex, string length and source numeric limits for repeated/scalar fields", () => {
    const types = [
      { type: "email", regex: "[^ @]+@[^ @]+\\.[^ @]+" },
      { type: "counter", valueType: "Number" },
    ];
    expect(validateAttribute({ type: "email", isRequired: true }, [], types)).toContain("required");
    expect(validateAttribute({ type: "email" }, ["a@example.com", "invalid"], types)).toContain(
      "invalid format",
    );
    expect(validateAttribute({ type: "string", length: "3" }, "four", types)).toContain("3 characters");
    expect(validateAttribute({ type: "counter" }, "2147483648", types)).toContain("2147483647");
    expect(validateAttribute({ type: "integer" }, "1.2", types)).toContain("valid number");
    expect(validateAttribute({ type: "boolean", isRequired: true }, false, types)).toBeNull();
    expect(validateAttribute({ type: "email" }, ["a@example.com", "b@example.com"], types)).toBeNull();
  });
});
