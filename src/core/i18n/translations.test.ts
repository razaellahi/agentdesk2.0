import { describe, expect, it } from "vitest";
import { deepMerge, parseTranslationsResponse } from "./translations";
import { languageMeta } from "./languages";

describe("parseTranslationsResponse", () => {
  it("multi-locale shape", () => {
    expect(parseTranslationsResponse({ translations: { en: { a: 1 }, ar: { a: 2 } } }, ["en", "ar"])).toEqual(
      {
        en: { a: 1 },
        ar: { a: 2 },
      },
    );
  });
  it("single-locale shape", () => {
    expect(parseTranslationsResponse({ locale: "fr", translations: { login: {} } }, ["fr"])).toEqual({
      fr: { login: {} },
    });
  });
  it("array shape", () => {
    expect(parseTranslationsResponse([{ locale: "en", translations: { x: "y" } }], ["en"])).toEqual({
      en: { x: "y" },
    });
  });
  it("flat keyed by locale", () => {
    expect(parseTranslationsResponse({ ur: { x: "y" } }, ["ur"])).toEqual({ ur: { x: "y" } });
  });
});

describe("deepMerge", () => {
  it("lets admin-edited values override bundled ones but keeps bundled-only keys", () => {
    const merged = deepMerge(
      { login: { login: "Login", username: "Username" }, nav: { main: "Main" } },
      { login: { login: "Sign in", username: "" } },
    );
    expect(merged).toEqual({ login: { login: "Sign in", username: "Username" }, nav: { main: "Main" } });
  });
});

describe("languageMeta", () => {
  it("maps legacy codes to BCP-47 and direction", () => {
    expect(languageMeta("ger").bcp47).toBe("de");
    expect(languageMeta("spa").bcp47).toBe("es");
    expect(languageMeta("ar").dir).toBe("rtl");
    expect(languageMeta("ur").dir).toBe("rtl");
    expect(languageMeta("xx").bcp47).toBe("xx");
  });
});
