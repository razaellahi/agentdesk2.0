import { describe, expect, it } from "vitest";
import { buildCustomersQuery } from "./customersQuery";

const base = { limit: 25, offset: 50, fields: ["firstName", "email"] };

describe("buildCustomersQuery", () => {
  it("lists everyone when nothing is typed", () => {
    const query = buildCustomersQuery({ ...base, term: "  " });
    expect(query).toContain("pagination: { limit: 25, offset: 50 }");
    expect(query).toContain("sort: { sortBy: null, sortOrder: null }");
    expect(query).not.toContain("searchTerm");
    expect(query).not.toContain("Filter:");
  });

  it("searches every attribute with a search term when no field is chosen", () => {
    const query = buildCustomersQuery({ ...base, term: " amina " });
    expect(query).toContain('searchTerm: "amina"');
    expect(query).not.toContain("Filter:");
  });

  it("filters one attribute when a field is chosen", () => {
    const query = buildCustomersQuery({ ...base, term: "amina", field: "firstName" });
    expect(query).toContain('Filter: { and: [ { key: "firstName", operator: contains, value: "amina" } ] }');
    expect(query).not.toContain("searchTerm");
  });

  it("keeps quotes and newlines in the text from breaking the query", () => {
    const query = buildCustomersQuery({ ...base, term: 'a"b\\c\nd' });
    expect(query).toContain('searchTerm: "a\\"b\\\\c\\nd"');
  });

  it("sorts and always reads the id and anonymous flag", () => {
    const query = buildCustomersQuery({ ...base, sort: "lastName:desc" });
    expect(query).toContain('sort: { sortBy: "lastName", sortOrder: "desc" }');
    expect(query).toMatch(/docs \{ _id\s+isAnonymous\s+firstName\s+email \}/);
  });
});
