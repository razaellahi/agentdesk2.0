export function httpLink(value: unknown): string | undefined {
  return typeof value === "string" && /^https?:\/\//i.test(value) ? value : undefined;
}
