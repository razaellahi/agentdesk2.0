/**
 * The customer API's GraphQL, for `pnpm mock`: the full-text `Customers` search, the saved-filter
 * `getCustomerByFilterQuery`, and the saved filters themselves. Arguments arrive inline in the query text
 * (as unified-agent sends them), so they are read back out of it.
 */

type Row = Record<string, unknown>;
type Gql = { query?: string; variables?: Record<string, unknown> };

export interface SavedFilterDoc {
  _id: string;
  filterName: string;
  filterQuery: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const unescape = (text: string) => text.replace(/\\(["\\n])/g, (_, c: string) => (c === "n" ? "\n" : c));

/** What a row holds for an attribute, as text: lists are joined, labels are skipped. */
function textOf(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (typeof value === "object") return "";
  return String(value);
}

/** One condition of a filter, the way the customer API reads its operators. */
function matches(value: unknown, operator: string, wanted: unknown): boolean {
  const have = textOf(value).toLowerCase();
  const want = String(wanted ?? "").toLowerCase();
  switch (operator) {
    case "contains":
      return have.includes(want);
    case "notContains":
      return !have.includes(want);
    case "equalTo":
      return have === want;
    case "notEqualTo":
      return have !== want;
    case "startsWith":
      return have.startsWith(want);
    case "endsWith":
      return have.endsWith(want);
    case "isEmpty":
      return have === "";
    case "isNotEmpty":
      return have !== "";
    default:
      return true;
  }
}

/** A saved filter's query: `{ attr: { op: value } }`, `{ and: [...] }` or `{ or: [...] }`, nested. */
export function matchesFilterQuery(row: Row, node: unknown): boolean {
  if (!node || typeof node !== "object") return true;
  return Object.entries(node as Record<string, unknown>).every(([key, condition]) => {
    if (key === "and") return (condition as unknown[]).every((child) => matchesFilterQuery(row, child));
    if (key === "or") return (condition as unknown[]).some((child) => matchesFilterQuery(row, child));
    // Labels are stored as ids and filtered by a comma-separated list of ids: any of them (or none of them).
    if (key === "labels") {
      const wanted = String(
        (condition as Record<string, unknown>).contains ??
          (condition as Record<string, unknown>).notContains ??
          "",
      ).split(",");
      const has = ((row.labels as string[]) ?? []).some((id) => wanted.includes(id));
      return "notContains" in (condition as object) ? !has : has;
    }
    return Object.entries(condition as Record<string, unknown>).every(([operator, wanted]) =>
      matches(row[key], operator, wanted),
    );
  });
}

function sortRows(rows: Row[], sortBy?: string, order = "asc") {
  if (!sortBy) return rows;
  const sign = order.toLowerCase() === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => sign * textOf(a[sortBy]).localeCompare(textOf(b[sortBy])));
}

function page(rows: Row[], limit: number, offset: number) {
  return { totalDocs: rows.length, limit, offset, docs: rows.slice(offset, offset + limit) };
}

/** `Customers(...)` and `getCustomerByFilterQuery(...)` against the mock phonebook. */
export function customersGraphql(body: Gql, phonebook: Row[]) {
  const query = body.query ?? "";
  if (query.includes("getCustomerByFilterQuery")) {
    const vars = body.variables ?? {};
    const filter = JSON.parse(String(vars.filterQueryString ?? "{}")) as unknown;
    const [sortBy, order] = String(vars.sort ?? "").split(":");
    const rows = sortRows(
      phonebook.filter((row) => matchesFilterQuery(row, filter)),
      sortBy,
      order,
    );
    return {
      data: { getCustomerByFilterQuery: page(rows, Number(vars.limit) || 25, Number(vars.offset) || 0) },
    };
  }

  const pagination = /pagination:\s*\{\s*limit:\s*(\d+|null),\s*offset:\s*(\d+|null)/.exec(query);
  const limit = Number(pagination?.[1]) || 25;
  const offset = Number(pagination?.[2]) || 0;
  const sort = /sortBy:\s*"([^"]*)",\s*sortOrder:\s*"([^"]*)"/.exec(query);
  const term = /searchTerm:\s*"((?:[^"\\]|\\.)*)"/.exec(query)?.[1];
  const filter = /key:\s*"([^"]*)",\s*operator:\s*(\w+),\s*value:\s*"((?:[^"\\]|\\.)*)"/.exec(query);

  let rows = phonebook;
  if (term) {
    const needle = unescape(term).toLowerCase();
    rows = rows.filter((row) =>
      Object.entries(row).some(
        ([key, value]) => key !== "_id" && key !== "labels" && textOf(value).toLowerCase().includes(needle),
      ),
    );
  }
  if (filter) rows = rows.filter((row) => matches(row[filter[1]!], filter[2]!, unescape(filter[3]!)));
  return { data: { Customers: page(sortRows(rows, sort?.[1], sort?.[2]), limit, offset) } };
}

/** The saved-filter queries and mutations of `/filter`. */
export function filtersGraphql(body: Gql, store: SavedFilterDoc[]) {
  const query = body.query ?? "";
  const vars = body.variables ?? {};
  const now = new Date().toISOString();
  const nameIn = (text: string) => /"((?:[^"\\]|\\.)*)"/.exec(text)?.[1];

  if (query.includes("createFilter")) {
    const doc: SavedFilterDoc = {
      _id: `filter-${store.length + 1}-${Date.now()}`,
      filterName: String(vars.filterName),
      filterQuery: JSON.parse(String(vars.filterQueryString ?? "{}")),
      createdAt: now,
      updatedAt: now,
    };
    store.unshift(doc);
    return { data: { createFilter: doc } };
  }
  if (query.includes("updateFilterByID")) {
    const doc = store.find((item) => item._id === vars.id);
    if (!doc) return { errors: [{ message: "Filter not found" }] };
    doc.filterName = String(vars.filterName);
    doc.filterQuery = JSON.parse(String(vars.filterQueryString ?? "{}"));
    doc.updatedAt = now;
    return { data: { updateFilterByID: doc } };
  }
  if (query.includes("deleteFilterByID")) {
    const id = nameIn(query);
    const index = store.findIndex((item) => item._id === id);
    const [doc] = index >= 0 ? store.splice(index, 1) : [];
    return { data: { deleteFilterByID: doc ?? null } };
  }
  if (query.includes("getFilterByName")) {
    const name = nameIn(query);
    return { data: { getFilterByName: store.find((item) => item.filterName === name) ?? null } };
  }
  const limit = Number(vars.limit) || 50;
  const offset = Number(vars.offset) || 0;
  return {
    data: {
      getFilters: {
        totalDocs: store.length,
        hasNextPage: offset + limit < store.length,
        docs: store.slice(offset, offset + limit),
      },
    },
  };
}

const iso = new Date().toISOString();

/** Filters an agent might already have saved, to open and apply in the demo. */
export const demoSavedFilters = (): SavedFilterDoc[] => [
  {
    _id: "filter-whatsapp",
    filterName: "Reachable on WhatsApp",
    filterQuery: { whatsapp: { isNotEmpty: "true" } },
    createdAt: iso,
    updatedAt: iso,
  },
  {
    _id: "filter-email-social",
    filterName: "Email and Facebook",
    filterQuery: { and: [{ email: { isNotEmpty: "true" } }, { facebook: { isNotEmpty: "true" } }] },
    createdAt: iso,
    updatedAt: iso,
  },
];
