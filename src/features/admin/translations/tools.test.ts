import { describe, expect, it } from "vitest";
import {
  countChanged,
  extractReferenceTemplate,
  flatten,
  invalidValuePath,
  unflatten,
  validateAgainstReference,
  validateCompare,
} from "./tools";

const ref = { login: { login: "Login", username: "Username" }, globals: { yes: "Yes" } };
const labels = { left: "Default translation", right: "French" };

describe("translation tools", () => {
  it("flattens and unflattens nested trees", () => {
    const flat = flatten(ref);
    expect(flat).toEqual({ "login.login": "Login", "login.username": "Username", "globals.yes": "Yes" });
    expect(unflatten(flat)).toEqual(ref);
  });

  it("accepts a matching file", () => {
    expect(
      validateAgainstReference(
        ref,
        { globals: { yes: "Oui" }, login: { username: "Nom", login: "Connexion" } },
        labels,
      ),
    ).toBeNull();
  });

  it("reports missing and extra keys", () => {
    const res = validateAgainstReference(
      ref,
      { login: { login: "x", extra: "y" }, globals: { yes: "z" } },
      labels,
    )!;
    expect(res.missingKeys).toEqual(["login.username"]);
    expect(res.extraKeys).toEqual(["login.extra"]);
    expect(res.leftKeyCount).toBe(3);
  });

  it("flags structure changes (leaf vs object)", () => {
    const res = validateAgainstReference(ref, { login: "flat", globals: { yes: "y" } }, labels)!;
    expect(res.structureMismatch).toBe(true);
    expect(res.reason).toBe("structure");
  });

  it("compares two languages", () => {
    expect(validateCompare({ a: "1", "b.c": "2" }, { a: "x", "b.c": "y" }, labels)).toBeNull();
    expect(validateCompare({ a: "1" }, { a: "x", b: "y" }, labels)?.extraKeys).toEqual(["b"]);
  });

  it("extracts the reference template from a locale map", () => {
    expect(extractReferenceTemplate({ translations: { en: ref } })).toEqual(ref);
    expect(extractReferenceTemplate(ref)).toEqual(ref);
    expect(extractReferenceTemplate([])).toBeNull();
  });

  it("rejects null leaves and counts changes", () => {
    expect(invalidValuePath({ a: { b: null } } as never)).toContain("a.b");
    expect(countChanged({ a: "1", b: "2" }, { a: "1", b: "3", c: "4" })).toBe(2);
  });
});
