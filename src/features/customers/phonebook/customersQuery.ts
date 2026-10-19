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
