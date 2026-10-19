export interface Token {
  word: string;
  start: number;
  end: number;
}

// Letters (any script) with inner apostrophes/hyphens: "don't", "e-mail", "été".
const WORD = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;
// Spans that are not prose and must not be checked.
const SKIP = /\bhttps?:\/\/\S+|\bwww\.\S+|\S+@\S+\.\S+|[#@/]\S+|`[^`]*`/gu;

/** Words worth checking, with their offsets in `text`. */
export function tokenize(text: string): Token[] {
  const skipped: [number, number][] = [];
  for (const m of text.matchAll(SKIP)) skipped.push([m.index!, m.index! + m[0].length]);
  const inSkip = (i: number) => skipped.some(([a, b]) => i >= a && i < b);

  const tokens: Token[] = [];
  for (const m of text.matchAll(WORD)) {
    const start = m.index!;
    const word = m[0];
    if (word.length < 2 || inSkip(start)) continue;
    // All-caps words are usually acronyms or product names.
    if (word.length > 1 && word === word.toUpperCase() && word !== word.toLowerCase()) continue;
    tokens.push({ word, start, end: start + word.length });
  }
  return tokens;
}

/** The token under the caret, if any. */
export function tokenAt(tokens: Token[], caret: number): Token | null {
  return tokens.find((t) => caret >= t.start && caret <= t.end) ?? null;
}

/** Replaces one token and returns the new text with the caret after the replacement. */
export function replaceToken(
  text: string,
  token: Token,
  replacement: string,
): { text: string; caret: number } {
  return {
    text: text.slice(0, token.start) + replacement + text.slice(token.end),
    caret: token.start + replacement.length,
  };
}
