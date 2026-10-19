import { unifiedAdminApi } from "@/core/api";
import { fromFormDocument, toFormPayload, type QmModelDraft, type QmModelSummary } from "./model";

const opts = { legacyTenantHeaders: true } as const;

export async function listQmModels(): Promise<QmModelSummary[]> {
  const body = await unifiedAdminApi.get<QmModelSummary[] | { docs?: QmModelSummary[] }>("/forms", opts);
  const rows = Array.isArray(body) ? body : (body?.docs ?? []);
  return rows.filter((row) => row && (row as { isDeleted?: boolean }).isDeleted !== true);
}

export async function getQmModel(id: string): Promise<QmModelDraft> {
  const doc = await unifiedAdminApi.get<Record<string, unknown>>(`/forms/${encodeURIComponent(id)}`, opts);
  return fromFormDocument(doc);
}

export function saveQmModel(model: QmModelDraft): Promise<unknown> {
  const payload = toFormPayload(model);
  return model.id
    ? unifiedAdminApi.put("/forms", payload, opts)
    : unifiedAdminApi.post("/forms", payload, opts);
}

export function deleteQmModel(id: string): Promise<unknown> {
  return unifiedAdminApi.delete(`/forms/${encodeURIComponent(id)}`, opts);
}
