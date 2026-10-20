import { ApiError, caseApi, fileEngineApi } from "@/core/api";
import type { AttachmentInput, CaseAttachment, CimCustomerDoc, CimLabel } from "./types";

interface GraphqlError {
  message: string;
  extensions?: { code?: string };
}

interface GraphqlResponse<T> {
  data?: T | null;
  errors?: GraphqlError[];
}

function graphqlError(errors: GraphqlError[], status: number): ApiError {
  const first = errors.find((error) => error.message) ?? errors[0];
  return new ApiError(
    first?.message || "Case Management request failed",
    status,
    first?.extensions?.code ?? "GRAPHQL",
    errors,
  );
}

/**
 * One GraphQL operation against `${CASE_MANAGEMENT_API_URL}/graphql` with the desk token and
 * tenant header. GraphQL errors throw like Apollo's default error policy did.
 */
export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  let res: GraphqlResponse<T> | undefined;
  try {
    res = await caseApi.post<GraphqlResponse<T>>("/graphql", { query, variables }, { signal });
  } catch (error) {
    // Apollo Server answers validation errors with HTTP 400 + { errors }.
    const errors = error instanceof ApiError ? (error.data as GraphqlResponse<T> | null)?.errors : undefined;
    if (errors?.length && error instanceof ApiError) throw graphqlError(errors, error.status);
    throw error;
  }
  if (res?.errors?.length) throw graphqlError(res.errors, 200);
  if (!res?.data) throw new ApiError("Empty response from Case Management", 0, "EMPTY");
  return res.data;
}

// --- CIM customer proxy (backend routes/cim; resolves CIM per tenant server-side)

export async function searchCimCustomers(searchTerm: string, limit = 10, offset = 0) {
  const res = await caseApi.post<{ data: { docs: CimCustomerDoc[]; totalDocs: number } }>(
    "/api/v1/cim/customers/search",
    { searchTerm, limit, offset },
  );
  return res.data;
}

export async function getCimCustomer(id: string) {
  const res = await caseApi.get<{ data: CimCustomerDoc }>(`/api/v1/cim/customers/${encodeURIComponent(id)}`);
  return res.data;
}

export async function listCimLabels() {
  const res = await caseApi.get<{ data: CimLabel[] | null }>("/api/v1/cim/labels");
  return res.data ?? [];
}

// --- Console REST exports

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadExport(path: string, searchParams: Record<string, string>, fallbackName: string) {
  const response = await caseApi.get<Response>(path, { searchParams, timeout: 120_000 }, "response");
  const disposition = response.headers.get("content-disposition") ?? "";
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  saveBlob(await response.blob(), fileName);
}

/** Workbench CSV (`view` = unassigned | my | all). */
export const exportCasesCsv = (view: "unassigned" | "my" | "all") =>
  downloadExport("/api/v1/console/cases/export", { view }, `cases-${view}.csv`);

export const exportReportCsv = (report: string, dateFrom: string, dateTo: string) =>
  downloadExport("/api/v1/console/reports/export", { report, dateFrom, dateTo }, `report-${report}.csv`);

// --- File Engine (same service and form fields as the source FileUploadService)

const ALLOWED_EXTENSIONS = new Set([
  "txt",
  "png",
  "jpg",
  "svg",
  "css",
  "oga",
  "mpga",
  "gif",
  "csv",
  "webp",
  "jpeg",
  "pdf",
  "ppt",
  "pptx",
  "xlsx",
  "xls",
  "doc",
  "docx",
  "mp4",
  "mp3",
  "eml",
  "json",
  "log",
  "rtf",
]);

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const ATTACHMENT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.gif,.json,.csv,.txt,.log,.doc,.docx,.ppt,.pptx,.xlsx,.xls,.mp4,.mp3,.rtf,.svg";

export function isAllowedAttachment(fileName: string): boolean {
  return ALLOWED_EXTENSIONS.has(fileName.split(".").pop()?.toLowerCase() ?? "");
}

export interface UploadScope {
  /** Existing case id (comments / post-create). */
  caseId?: string | null;
  /** Draft scope before the case exists (create form). */
  draftId?: string | null;
  interactionId?: string | null;
  caseReferenceId?: string | null;
  customerProfileId?: string | null;
}

/** File Engine stores blobs as `{conversationId}_{storedFileName}`. */
export function resolveFileEngineExternalId(
  responseName: string | undefined,
  conversationId: string,
  storedName: string,
): string {
  const name = responseName?.trim();
  if (!name || name.startsWith("undefined_")) return `${conversationId}_${storedName}`;
  return name;
}

function storedFileName(originalName: string) {
  const dot = originalName.lastIndexOf(".");
  const extension = dot !== -1 ? originalName.substring(dot + 1) : "";
  const uniqueId = crypto.randomUUID().replace(/-/g, "");
  return extension ? `${uniqueId}.${extension}` : uniqueId;
}

export async function uploadCaseAttachment(file: File, scope: UploadScope): Promise<AttachmentInput> {
  if (!isAllowedAttachment(file.name)) throw new Error(`Unsupported file type: ${file.name}`);
  const storedName = storedFileName(file.name);
  const form = new FormData();
  form.append("file", new File([file], storedName, { type: file.type }));
  form.append("roomInfo", String(Math.floor(Math.random() * 90000) + 10000));
  const caseScopeId = scope.caseId?.trim() || scope.draftId?.trim() || "";
  const conversationId = caseScopeId || scope.interactionId?.trim() || "case-draft";
  form.append("conversationId", conversationId);
  if (caseScopeId) form.append("caseId", caseScopeId);
  if (scope.caseReferenceId?.trim()) form.append("caseReferenceId", scope.caseReferenceId.trim());
  if (scope.customerProfileId?.trim()) form.append("customerProfileId", scope.customerProfileId.trim());
  form.append("uploadContext", scope.caseId ? "case" : "case-draft");
  let response: { name?: string; type?: string; size?: number } | undefined;
  try {
    response = await fileEngineApi.post("/api/uploadFileStream", form, { timeout: 120_000 });
  } catch (error) {
    if (error instanceof ApiError && error.status === 413)
      throw new Error(`File too large: ${file.name}`, { cause: error });
    throw error;
  }
  return {
    fileName: file.name,
    externalFileId: resolveFileEngineExternalId(response?.name, conversationId, storedName),
    mimeType: response?.type ?? (file.type || null),
    sizeBytes: response?.size ?? (file.size > 0 ? file.size : null),
  };
}

export function fetchAttachmentBlob(attachment: CaseAttachment): Promise<Blob> {
  if (attachment.externalFileId) {
    return fileEngineApi.get<Blob>(
      "/api/downloadFileStream",
      { searchParams: { filename: attachment.externalFileId } },
      "blob",
    );
  }
  if (!attachment.mediaUrl) return Promise.reject(new Error("File URL is not available"));
  return fileEngineApi.get<Blob>(new URL(attachment.mediaUrl, globalThis.location.origin).href, {}, "blob");
}

export function downloadAttachment(attachment: CaseAttachment, blob: Blob) {
  saveBlob(blob, attachment.fileName);
}
