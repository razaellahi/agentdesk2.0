import type { FilterQuery, FilterRow } from "./types";

export const STRING_OPS = [
  "startsWith",
  "endsWith",
  "equalTo",
  "notEqualTo",
  "contains",
  "notContains",
  "isEmpty",
  "isNotEmpty",
] as const;

export const BOOLEAN_OPS = ["equalTo", "notEqualTo"] as const;
export const LABEL_OPS = ["contains", "notContains"] as const;

export function operatorsForType(type: string | undefined) {
  const normalized = (type ?? "string").toLowerCase();
  if (normalized === "boolean") return [...BOOLEAN_OPS];
  if (normalized === "labels") return [...LABEL_OPS];
  return [...STRING_OPS];
}

/** Port of UA phonebook.parseFilterForm for AND/OR filter rows. */
export function parseFilterForm(rows: FilterRow[]): FilterQuery {
  const conditions = rows.filter((row) => row.filterOption !== "OR" || row.attributeName);
  if (conditions.length === 0) return {};

  const asCondition = (row: FilterRow) => {
    let value: string | string[] = row.filterValue;
    if (Array.isArray(value)) value = value.toString();
    return { [row.attributeName]: { [row.filterCondition]: value } };
  };

  if (rows.length === 1 && rows[0]) return asCondition(rows[0]);

  const result: { or?: FilterQuery[] } = {};
  let group: FilterQuery[] = [];

  for (const row of rows) {
    if (row.filterOption === "OR") {
      result.or ??= [];
      if (group.length === 1 && group[0]) result.or.push(structuredClone(group[0]));
      else if (group.length > 1) result.or.push({ and: structuredClone(group) });
      group = [];
      continue;
    }
    if (row.attributeName && row.filterCondition) group.push(asCondition(row));
  }

  if (group.length > 0) {
    if (!result.or) return { and: structuredClone(group) };
    if (group.length === 1 && group[0]) result.or.push(structuredClone(group[0]));
    else result.or.push({ and: structuredClone(group) });
  }
  return result;
}

export function filterRowsFromQuery(query: FilterQuery): FilterRow[] {
  const rows: FilterRow[] = [];
  const pushCondition = (obj: FilterQuery, option: "AND" | "OR" = "AND") => {
    for (const [key, value] of Object.entries(obj)) {
      if (key === "and" && Array.isArray(value)) {
        value.forEach((item) => pushCondition(item as FilterQuery, "AND"));
        continue;
      }
      if (key === "or" && Array.isArray(value)) {
        value.forEach((item, index) => {
          if (index > 0) {
            rows.push({
              id: crypto.randomUUID(),
              attributeName: "",
              filterCondition: "",
              filterValue: "",
              filterOption: "OR",
            });
          }
          pushCondition(item as FilterQuery, "AND");
        });
        continue;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const [op, raw] = Object.entries(value as Record<string, unknown>)[0] ?? [];
        if (!op) continue;
        rows.push({
          id: crypto.randomUUID(),
          attributeName: key,
          filterCondition: op,
          filterValue:
            key.toLowerCase() === "labels" && typeof raw === "string" ? raw.split(",") : (raw as string),
          filterOption: option,
        });
      }
    }
  };
  pushCondition(query);
  return rows.length
    ? rows
    : [
        {
          id: crypto.randomUUID(),
          attributeName: "",
          filterCondition: "contains",
          filterValue: "",
          filterOption: "AND",
        },
      ];
}

export function newFilterRow(option: "AND" | "OR" = "AND"): FilterRow {
  return {
    id: crypto.randomUUID(),
    attributeName: "",
    filterCondition: option === "OR" ? "" : "contains",
    filterValue: "",
    filterOption: option,
  };
}
