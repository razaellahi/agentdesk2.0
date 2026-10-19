import {
  ccmApi,
  cimCustomerApi,
  conversationManagerApi,
  fileEngineApi,
  llmApi,
  unifiedAdminApi,
} from "@/core/api";
import type { ReasonCode } from "./store/agentStore";
import type { PullModeList } from "./store/pullModeStore";

export interface SchemaAttribute {
  key: string;
  label?: string;
  type: string;
  isPii?: boolean;
  isChannelIdentifier?: boolean;
  channelTypes?: string[];
  sortOrder?: number;
  [key: string]: unknown;
}

export const workspaceKeys = {
  reasons: ["workspace", "reasons"] as const,
  schema: ["workspace", "customer-schema"] as const,
  pullLists: ["workspace", "pull-mode-lists"] as const,
  channelLogo: (name: string) => ["workspace", "channel-logo", name] as const,
};

export const getReasonCodes = () => unifiedAdminApi.get<ReasonCode[]>("/reasons");

export async function getCustomerSchema(): Promise<SchemaAttribute[]> {
  const schema = await cimCustomerApi.get<SchemaAttribute[] | { docs?: SchemaAttribute[] }>(
    "/customerSchema",
  );
  const list = Array.isArray(schema) ? schema : (schema?.docs ?? []);
  return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export const getPullModeLists = () => unifiedAdminApi.get<PullModeList[]>("/pull-mode-list");

/** Channel logos are files in the file engine; returned as an object URL. */
export async function getChannelLogo(filename: string): Promise<string> {
  const blob = await fileEngineApi.get<Blob>(
    "/api/downloadFileStream",
    { searchParams: { filename } },
    "blob",
  );
  return URL.createObjectURL(blob);
}

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  [key: string]: unknown;
}

export function uploadFile(form: FormData) {
  return fileEngineApi.post<UploadedFile>("/api/uploadFileStream", form);
}

/** Wrap-up form id used by unified-agent (forms service). */
export const WRAP_UP_FORM_ID = "62d07f4f0980a50a91210bef";

export interface WrapUpCategory {
  label?: string;
  _categoryIndex?: number;
  [key: string]: unknown;
}

export interface WrapUpOption {
  label?: string;
  value?: string;
  categoryName?: string;
  [key: string]: unknown;
}

export interface WrapUpPage<T> {
  categories?: T[];
  options?: T[];
  results?: T[];
  metadata?: {
    hasMore?: boolean;
    currentPage?: number;
    totalPages?: number;
    totalCategories?: number;
    totalOptions?: number;
    totalMatches?: number;
  };
  sections?: { attributes?: { attributeOptions?: { isMultipleChoice?: boolean } }[] }[];
}

const wrapParams = (params: Record<string, string | number>) => ({ searchParams: params });

export const getWrapUpForm = () => unifiedAdminApi.get<WrapUpPage<never>>(`/forms/${WRAP_UP_FORM_ID}`);

export const getWrapUpCategories = (page: number, limit = 5) =>
  unifiedAdminApi.get<WrapUpPage<WrapUpCategory>>(
    `/forms/paginatedForm/${WRAP_UP_FORM_ID}`,
    wrapParams({ level: "categories", sectionIndex: 0, attributeIndex: 0, page, limit }),
  );

export const getWrapUpOptions = (categoryIndex: number, page: number, limit = 20) =>
  unifiedAdminApi.get<WrapUpPage<WrapUpOption>>(
    `/forms/paginatedForm/${WRAP_UP_FORM_ID}`,
    wrapParams({ level: "options", sectionIndex: 0, attributeIndex: 0, categoryIndex, page, limit }),
  );

export const searchWrapUps = (q: string, page: number, limit = 20) =>
  unifiedAdminApi.get<WrapUpPage<WrapUpOption>>(
    `/forms/wrapupSearch/${WRAP_UP_FORM_ID}`,
    wrapParams({ q, sectionIndex: 0, attributeIndex: 0, page, limit }),
  );

export interface QuickReply {
  id: string;
  message: string;
  tags: string[];
}

interface QuickReplyDoc {
  _id?: string;
  id?: string;
  quickReplies?: QuickReply[];
}

function asQuickReplyDoc(body: unknown): QuickReplyDoc {
  const payload = (Array.isArray(body) ? body[0] : body) as QuickReplyDoc | null;
  return payload ?? {};
}

export async function loadQuickReplies(userId: string) {
  const doc = asQuickReplyDoc(
    await cimCustomerApi.get("/quick-replies", { searchParams: { user_Id: userId } }),
  );
  return { id: doc._id ?? doc.id ?? null, replies: doc.quickReplies ?? [] };
}

export function linkConversationCustomer(conversationId: string, customer: object) {
  return conversationManagerApi.put(`/customer-topics/${conversationId}/update-customer`, customer);
}

export function sendOutboundSms(message: Record<string, unknown>) {
  return ccmApi.post("/message/send", message);
}

export async function refineText(text: string) {
  const response = await llmApi.post<{ data?: { text?: string }; status?: number }>("/refine-text", { text });
  return response.data?.text ?? "";
}

export interface KnowledgeBaseHit {
  query: string;
  answer: string;
  sources?: { title?: string; url?: string; score?: number }[];
}

/** POST `{ query, targeted_language }` to the configured knowledge-base URL (UA getLLMAnswerOnQuery). */
export async function searchKnowledgeBase(input: { url: string; query: string; language: string }) {
  const response = await llmApi.post<{
    answer?: string;
    sources?: KnowledgeBaseHit["sources"];
  }>(input.url, {
    query: input.query.trim(),
    targeted_language: input.language || "en",
  });
  return {
    query: input.query.trim(),
    answer: response?.answer ?? "",
    sources: response?.sources ?? [],
  } satisfies KnowledgeBaseHit;
}

export function saveQuickReplies(userId: string, documentId: string | null, replies: QuickReply[]) {
  const body = { user_Id: userId, quickReplies: replies };
  return documentId
    ? cimCustomerApi.put(`/quick-replies/${documentId}`, body)
    : cimCustomerApi.post("/quick-replies", body);
}
