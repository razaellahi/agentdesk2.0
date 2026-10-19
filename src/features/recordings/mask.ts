const PATTERNS = [/^\*?\d+\*?$/, /^\d+\?{1,2}$/, /^>\d+$/, /^\d+>$/, /^\d+=\d+$/, /^\*$/];

/** VRS recording-rule mask: digits plus one of * ? = >. */
export function maskError(value: string): "empty" | "letters" | "pattern" | null {
  const mask = value.trim();
  if (!mask) return "empty";
  if (/[a-zA-Z]/.test(mask)) return "letters";
  const specials = new Set(["*", "?", "=", ">"]);
  let found: string | null = null;
  for (const char of mask) {
    if (!specials.has(char)) continue;
    if (found && char !== found) return "pattern";
    found = char;
  }
  return PATTERNS.some((pattern) => pattern.test(mask)) ? null : "pattern";
}
