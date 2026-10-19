import { cimCustomerApi } from "@/core/api";
import type { PhonebookColumn, SchemaAttr, UserPreferenceDoc } from "./types";

export async function getUserPreference(userId: string) {
  const body = await cimCustomerApi.get<{ docs?: UserPreferenceDoc[] }>("/userPreference", {
    searchParams: { user_Id: userId },
  });
  return body?.docs?.[0] ?? null;
}

export function createUserPreference(payload: {
  user_Id: string;
  pageSize?: number | null;
  columns: PhonebookColumn[];
  sortOption?: { field: string; sortOption: string }[];
}) {
  return cimCustomerApi.post("/userPreference", {
    pageSize: null,
    sortOption: [{ field: "", sortOption: "" }],
    ...payload,
  });
}

export function updateUserPreference(id: string, payload: UserPreferenceDoc) {
  return cimCustomerApi.put(`/userPreference/${id}`, payload);
}

/** Merge saved column prefs with current schema (UA checkForSchemaConsistency). */
export function resolveColumns(
  schema: SchemaAttr[],
  saved: PhonebookColumn[] | null | undefined,
): PhonebookColumn[] {
  const usable = schema.filter((item) => item.key && item.key !== "isAnonymous");
  if (!saved?.length) {
    return usable
      .filter((item) => item.key?.toLowerCase() !== "labels")
      .slice(0, 6)
      .map((item) => ({
        field: item.key!,
        header: item.label || item.key!,
        type: item.type,
        key: item.key,
        isPii: item.isPii,
        isSearchAble: item.isSearchAble,
        channelTypes: item.channelTypes,
      }));
  }
  const cols: PhonebookColumn[] = [];
  for (const item of saved) {
    const match = usable.find((row) => row.key === item.field);
    if (!match || item.field.toLowerCase() === "labels") continue;
    cols.push({
      field: match.key!,
      header: match.label || match.key!,
      type: match.type,
      key: match.key,
      isPii: match.isPii,
      isSearchAble: match.isSearchAble,
      channelTypes: match.channelTypes,
    });
  }
  return cols.length > 0 ? cols : resolveColumns(usable, null);
}
