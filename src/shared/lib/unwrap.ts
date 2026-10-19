/** Accept the list shapes EF services actually return. */
export function unwrapList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["docs", "data", "rules", "logs", "items", "agents"]) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

export function unwrapTotal(body: unknown, fallback: number): number {
  if (!body || typeof body !== "object" || Array.isArray(body)) return fallback;
  const record = body as Record<string, unknown>;
  for (const key of ["total", "totalDocs", "totalRecords"]) {
    if (typeof record[key] === "number") return record[key];
  }
  return fallback;
}
