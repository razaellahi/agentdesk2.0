import { can } from "@/core/auth";
import { getConversation } from "@/features/workspace";
import { cimCustomerApi } from "@/core/api";

export interface CustomerRow {
  [key: string]: unknown;
  _id?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | string[];
  email?: string | string[];
  labels?: unknown[];
}

export interface CustomerPage {
  docs: CustomerRow[];
  totalDocs: number;
}

export interface Label {
  _id: string;
  name: string;
  colorCode: string;
  createdBy?: string;
  createdAt?: string;
}

export function asCustomerPage(body: unknown): CustomerPage {
  const root = (body ?? {}) as { docs?: CustomerRow[]; totalDocs?: number; data?: CustomerPage };
  const node = Array.isArray(root.docs) ? root : (root.data ?? {});
  return { docs: node.docs ?? [], totalDocs: node.totalDocs ?? 0 };
}

export function asLabels(body: unknown): Label[] {
  if (Array.isArray(body)) return body as Label[];
  if (body && typeof body === "object" && Array.isArray((body as { docs?: Label[] }).docs)) {
    return (body as { docs: Label[] }).docs;
  }
  return [];
}

/**
 * A customer's labels as label objects. The API stores ids (some payloads already carry
 * the objects), so ids are looked up in the label list, as unified-agent's fetchLabels does.
 */
export function hydrateLabels(value: unknown, all: Label[]): Label[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: Label[] = [];
  for (const item of value) {
    const id = typeof item === "string" ? item : String((item as { _id?: string } | null)?._id ?? "");
    const label =
      item && typeof item === "object" && "name" in item
        ? (item as Label)
        : all.find((candidate) => candidate._id === id);
    if (label && !seen.has(label._id ?? label.name)) {
      seen.add(label._id ?? label.name);
      out.push(label);
    }
  }
  return out;
}

export async function listCustomers(
  limit: number,
  offset: number,
  search: string,
  options: { sort?: string; labelIds?: string[]; field?: string } = {},
) {
  const paginateParts: string[] = [];
  if (search.trim()) {
    const field = options.field?.trim() || "firstName";
    paginateParts.push(`${field}:${search.trim()}`);
  }
  if (options.labelIds?.length) paginateParts.push(`labels:${options.labelIds.join(",")}`);
  const body = await cimCustomerApi.get("/customers", {
    searchParams: {
      limit,
      offset,
      sort: options.sort ?? "",
      paginateQuery: paginateParts.join(","),
    },
  });
  return asCustomerPage(body);
}

export async function listLabels() {
  return asLabels(await cimCustomerApi.get("/label"));
}

export function createLabel(label: { name: string; colorCode: string }) {
  if (!can("customerLabelsManage")) throw new Error("Label management permission is required.");
  return cimCustomerApi.post("/label", label);
}

/**
 * Creating a label from the customer form needs only the assign permission, as in
 * unified-agent (the label settings page is the one that needs manage).
 */
export function createLabelForCustomer(label: { name: string; colorCode: string; createdBy?: string }) {
  if (!can("customerLabels") && !can("customerLabelsManage"))
    throw new Error("Label permission is required.");
  return cimCustomerApi.post("/label", label);
}

export function updateLabel(id: string, label: { name: string; colorCode: string }) {
  if (!can("customerLabelsManage")) throw new Error("Label management permission is required.");
  return cimCustomerApi.put(`/label?_id=${encodeURIComponent(id)}`, label);
}

export function deleteLabel(id: string) {
  if (!can("customerLabelsManage")) throw new Error("Label management permission is required.");
  return cimCustomerApi.delete(`/label?_id=${encodeURIComponent(id)}`);
}

export function createCustomer(customer: Record<string, unknown>) {
  if (!can("customerManage")) throw new Error("Customer management permission is required.");
  return cimCustomerApi.post("/customers", customer);
}

export function updateCustomer(id: string, customer: Record<string, unknown>, conversationId?: string) {
  const inConversation =
    conversationId &&
    can("customerManageInConversation") &&
    getConversation(conversationId)?.customer._id === id;
  if (!can("customerManage") && !inConversation)
    throw new Error("Customer management permission is required.");
  return cimCustomerApi.put(`/customers/${id}`, customer);
}

export async function getCustomer(id: string) {
  const body = await cimCustomerApi.get<CustomerRow | { docs?: CustomerRow[] }>(`/customers/${id}`);
  if (body && typeof body === "object" && !Array.isArray(body) && "docs" in body) {
    return (Array.isArray(body.docs) ? (body.docs[0] ?? {}) : {}) as CustomerRow;
  }
  return body as CustomerRow;
}
