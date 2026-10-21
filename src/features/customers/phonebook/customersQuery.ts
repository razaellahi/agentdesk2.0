import { cimCustomerApi } from "@/core/api";
import { asCustomerPage, type CustomerPage } from "../api";
import type { CustomerDoc, FilterQuery } from "./types";

export async function listPhonebookCustomers(input: {
  limit: number;
  offset: number;
  sort?: string;
  field?: string;
  value?: string;
  labelIds?: string[];
}): Promise<CustomerPage> {
  const parts: string[] = [];
  if (input.field && input.value?.trim()) {
    parts.push(`${input.field}:${input.value.trim()}`);
  }
  if (input.labelIds?.length) parts.push(`labels:${input.labelIds.join(",")}`);
  const body = await cimCustomerApi.get("/customers", {
    searchParams: {
      limit: input.limit,
      offset: input.offset,
      sort: input.sort ?? "",
      paginateQuery: parts.join(","),
    },
  });
  return asCustomerPage(body);
}

/** Escapes a value for inlining in a GraphQL string literal (the customer API takes its arguments inline). */
function gqlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

export interface CustomerSearch {
  limit: number;
  offset: number;
  /** `field:asc` / `field:desc`. */
  sort?: string;
  /** Text typed in the search box. With a `field` it filters that attribute, without one it searches them all. */
  term?: string;
  field?: string;
  /** Attributes to read back for each customer. */
  fields: string[];
}

/**
 * The `Customers` query of the customer API (unified-agent's buildDynamicGQLQueryString): a full-text
 * `searchTerm` across the customer's searchable attributes, or a `contains` filter on one attribute.
 */
export function buildCustomersQuery(input: CustomerSearch): string {
  const term = input.term?.trim() ?? "";
  const [sortBy, sortOrder] = (input.sort ?? "").split(":");
  const args = [
    `pagination: { limit: ${input.limit}, offset: ${input.offset} }`,
    sortBy
      ? `sort: { sortBy: "${gqlString(sortBy)}", sortOrder: "${gqlString(sortOrder || "asc")}" }`
      : "sort: { sortBy: null, sortOrder: null }",
  ];
  if (term && input.field)
    args.push(
      `Filter: { and: [ { key: "${gqlString(input.field)}", operator: contains, value: "${gqlString(term)}" } ] }`,
    );
  else if (term) args.push(`searchTerm: "${gqlString(term)}"`);
  const fields = [...new Set(["_id", "isAnonymous", ...input.fields])];
  return `query Customers {
    Customers(${args.join(", ")}) {
      totalDocs
      limit
      offset
      docs { ${fields.join("\n")} }
    }
  }`;
}

/** Customers matching what the agent typed, as the phonebook lists them (no typing lists everyone). */
export async function searchCustomers(input: CustomerSearch, signal?: AbortSignal): Promise<CustomerPage> {
  const body = await cimCustomerApi.post<{
    data?: { Customers?: { docs?: CustomerDoc[]; totalDocs?: number } };
    errors?: { message?: string }[];
  }>("/v2/customers", { query: buildCustomersQuery(input) }, { signal });
  if (body.errors?.length) throw new Error(body.errors[0]?.message || "Search failed");
  const page = body.data?.Customers;
  return { docs: page?.docs ?? [], totalDocs: page?.totalDocs ?? 0 };
}

/** Advanced-filter path (UA getFilteredCustomers → POST /v2/customers). */
export async function getCustomersByFilterQuery(input: {
  filterQuery: FilterQuery;
  fields: string[];
  limit: number;
  offset: number;
  sort?: string;
}): Promise<CustomerPage> {
  const uniqueFields = [...new Set(["_id", "isAnonymous", ...input.fields])];
  const query = `
    query GetCustomerByFilterQuery($filterQueryString: String!, $limit: Int!, $offset: Int!, $sort: String!) {
      getCustomerByFilterQuery(
        filterQueryString: $filterQueryString,
        limit: $limit,
        offset: $offset,
        sort: $sort
      ) {
        docs { ${uniqueFields.join("\n")} }
        totalDocs
      }
    }`;
  const body = await cimCustomerApi.post<{
    data?: { getCustomerByFilterQuery?: { docs?: CustomerDoc[]; totalDocs?: number } };
    errors?: { message?: string }[];
  }>("/v2/customers", {
    query,
    variables: {
      filterQueryString: JSON.stringify(input.filterQuery),
      limit: input.limit,
      offset: input.offset,
      sort: input.sort ?? "",
    },
  });
  if (body.errors?.length) throw new Error(body.errors[0]?.message || "Filter failed");
  const page = body.data?.getCustomerByFilterQuery;
  return { docs: page?.docs ?? [], totalDocs: page?.totalDocs ?? 0 };
}

export function formatCellValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (typeof value[0] === "object" && value[0] && "name" in (value[0] as object)) {
      return value
        .map((item) => String((item as { name?: string }).name ?? ""))
        .filter(Boolean)
        .join(", ");
    }
    return value.map(String).join(", ");
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
