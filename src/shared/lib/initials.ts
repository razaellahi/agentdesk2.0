/** "Jane", "Doe" -> "JD"; falls back to the first two letters of `fallback`. */
export function initials(first?: string | null, last?: string | null, fallback = "?"): string {
  const value = `${first?.trim()?.[0] ?? ""}${last?.trim()?.[0] ?? ""}`.toUpperCase();
  return value || fallback.slice(0, 2).toUpperCase();
}
