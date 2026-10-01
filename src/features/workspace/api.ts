import { cimCustomerApi, fileEngineApi, unifiedAdminApi } from "@/core/api";
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
  const schema = await cimCustomerApi.get<SchemaAttribute[]>("/customerSchema");
  return [...(schema ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
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
