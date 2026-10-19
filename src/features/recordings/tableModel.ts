import { wrapupText, type Recording } from "./api";
export function recordingValue(row: Recording, key: string): string | number {
  if (key === "wrapup") return wrapupText(row);
  if (key.startsWith("call_variable"))
    return (
      row[key as `call_variable${number}`] ??
      row[key.replace("call_variable", "callVariable") as `callVariable${number}`] ??
      ""
    );
  const value = row[key as keyof Recording];
  return typeof value === "string" || typeof value === "number" ? value : "";
}
export function sortedRecordingGroups(rows: Recording[], key?: string, descending = false) {
  const sorted = key
    ? [...rows].sort((a, b) => {
        const av = recordingValue(a, key),
          bv = recordingValue(b, key);
        const order =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return descending ? -order : order;
      })
    : rows;
  const groups = new Map<string, Recording[]>();
  sorted.forEach((row, index) => {
    const id =
      row.correlationId && row.correlationId !== "0"
        ? `call:${row.correlationId}`
        : `session:${row.sessionId ?? index}:${index}`;
    groups.set(id, [...(groups.get(id) ?? []), row]);
  });
  return [...groups.entries()];
}
