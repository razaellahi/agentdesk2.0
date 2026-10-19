import { cimCustomerApi } from "@/core/api";
import type { FilterQuery, SavedFilter } from "./types";

interface GqlEnvelope<T> {
  data?: T;
  errors?: { message?: string }[];
}

async function filterGql<T>(query: string, variables?: Record<string, unknown>) {
  const body = await cimCustomerApi.post<GqlEnvelope<T>>("/filter", { query, variables });
  if (body.errors?.length) throw new Error(body.errors[0]?.message || "Filter query failed");
  return body.data as T;
}

export async function listSavedFilters(limit = 50, offset = 0) {
  const data = await filterGql<{
    getFilters: { docs: SavedFilter[]; totalDocs: number; hasNextPage?: boolean };
  }>(
    `query GetFilters($limit: Int, $offset: Int, $sort: String) {
      getFilters(limit: $limit, offset: $offset, sort: $sort) {
        totalDocs hasNextPage
        docs { _id filterName filterQuery createdAt updatedAt }
      }
    }`,
    { limit, offset, sort: "createdAt:desc" },
  );
  return data.getFilters;
}

export async function getFilterByName(filterName: string) {
  const data = await filterGql<{ getFilterByName: SavedFilter | null }>(
    `query GetFilterByName {
      getFilterByName(filterName: "${filterName.replaceAll('"', '\\"')}") {
        _id filterName filterQuery createdAt updatedAt
      }
    }`,
  );
  return data.getFilterByName;
}

export async function createSavedFilter(filterName: string, filterQuery: FilterQuery) {
  const data = await filterGql<{ createFilter: SavedFilter }>(
    `mutation CreateFilter($filterName: String!, $filterQueryString: String!) {
      createFilter(filterName: $filterName, filterQueryString: $filterQueryString) {
        _id filterName filterQuery createdAt updatedAt
      }
    }`,
    { filterName, filterQueryString: JSON.stringify(filterQuery) },
  );
  return data.createFilter;
}

export async function updateSavedFilter(id: string, filterName: string, filterQuery: FilterQuery) {
  const data = await filterGql<{ updateFilterByID: SavedFilter }>(
    `mutation UpdateFilter($id: String!, $filterName: String!, $filterQueryString: String!) {
      updateFilterByID(id: $id, filterName: $filterName, filterQueryString: $filterQueryString) {
        _id filterName filterQuery createdAt updatedAt
      }
    }`,
    { id, filterName, filterQueryString: JSON.stringify(filterQuery) },
  );
  return data.updateFilterByID;
}

export async function deleteSavedFilter(id: string) {
  await filterGql(`mutation DeleteFilter { deleteFilterByID(id: "${id.replaceAll('"', '\\"')}") { _id } }`);
}
