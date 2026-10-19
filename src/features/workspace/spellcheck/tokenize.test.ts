import { describe, expect, it } from "vitest";
import { replaceToken, tokenAt, tokenize } from "./tokenize";

describe("spellcheck tokenizer", () => {
  it("finds words with offsets, including accents and inner apostrophes", () => {
    const tokens = tokenize("Bonjour, l'été don't e-mail");
    expect(tokens.map((t) => t.word)).toEqual(["Bonjour", "l'été", "don't", "e-mail"]);
    expect(tokens[1]).toMatchObject({ start: 9, end: 14 });
  });

  it("skips urls, emails, mentions, code and acronyms", () => {
    const words = tokenize("see https://exmaple.com mail joe@acme.io @teem #tagg `cdoe` NASA ok").map(
      (t) => t.word,
    );
    expect(words).toEqual(["see", "mail", "ok"]);
  });

  it("locates the token under the caret and replaces it", () => {
    const text = "helo  world";
    const tokens = tokenize(text);
    const t = tokenAt(tokens, 2)!;
    expect(t.word).toBe("helo");
    expect(replaceToken(text, t, "hello")).toEqual({ text: "hello  world", caret: 5 });
    expect(tokenAt(tokens, 5)).toBeNull();
  });
});
