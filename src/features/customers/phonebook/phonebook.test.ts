import { describe, expect, it } from "vitest";
import { filterRowsFromQuery, parseFilterForm } from "./parseFilterForm";
import { resolveColumns } from "./preferencesApi";
import type { FilterRow, SchemaAttr } from "./types";

describe("parseFilterForm", () => {
  it("builds a single condition", () => {
    const rows: FilterRow[] = [
      {
        id: "1",
        attributeName: "firstName",
        filterCondition: "contains",
        filterValue: "Jo",
        filterOption: "AND",
      },
    ];
    expect(parseFilterForm(rows)).toEqual({ firstName: { contains: "Jo" } });
  });

  it("builds AND groups", () => {
    const rows: FilterRow[] = [
      {
        id: "1",
        attributeName: "firstName",
        filterCondition: "contains",
        filterValue: "Jo",
        filterOption: "AND",
      },
      {
        id: "2",
        attributeName: "email",
        filterCondition: "contains",
        filterValue: "@",
        filterOption: "AND",
      },
    ];
    expect(parseFilterForm(rows)).toEqual({
      and: [{ firstName: { contains: "Jo" } }, { email: { contains: "@" } }],
    });
  });
});

describe("filterRowsFromQuery", () => {
  it("round-trips a simple condition", () => {
    const rows = filterRowsFromQuery({ firstName: { contains: "A" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.attributeName).toBe("firstName");
    expect(rows[0]?.filterCondition).toBe("contains");
  });
});

describe("resolveColumns", () => {
  const schema: SchemaAttr[] = [
    { key: "firstName", label: "First", type: "string", isSearchAble: true },
    { key: "email", label: "Email", type: "email", isPii: true, isSearchAble: true },
    { key: "labels", label: "Labels", type: "labels" },
    { key: "isAnonymous", label: "Anon", type: "boolean" },
  ];

  it("defaults to schema without labels/anonymous", () => {
    const cols = resolveColumns(schema, null);
    expect(cols.map((col) => col.field)).toEqual(["firstName", "email"]);
  });

  it("keeps only valid saved prefs", () => {
    const cols = resolveColumns(schema, [
      { field: "email", header: "Old" },
      { field: "missing", header: "Gone" },
      { field: "labels", header: "Labels" },
    ]);
    expect(cols).toHaveLength(1);
    expect(cols[0]?.field).toBe("email");
    expect(cols[0]?.header).toBe("Email");
    expect(cols[0]?.isPii).toBe(true);
  });
});
