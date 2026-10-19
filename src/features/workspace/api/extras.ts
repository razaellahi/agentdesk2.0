import { getConfig } from "@/config";
import { ccmApi, secureLinkApi, unifiedAdminApi } from "@/core/api";
import { savePreferences } from "@/core/agent-settings";
import { encryptSecret } from "@/shared/lib/encrypt";
import type { CimMessage } from "../model/types";

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  pinned: boolean;
  accessRoles: string[];
}

export interface EmailSignature {
  signatureBody: string;
  signatureBodyWithAgentName: string;
}
export function loadEmailThreads(emailIds: string[], serviceIdentifier: string) {
  return ccmApi.post<{ emailMessages?: CimMessage[] }>("/email-threads", { emailIds, serviceIdentifier });
}
export interface SocialPost {
  socialMediaPost?: {
    username?: string;
    text?: string;
    timestamp?: number | string;
    permalinkUrl?: string;
    attachments?: { mediaUrl?: string; mimeType?: string }[];
    comments?: PostComment[];
  };
}
export interface PostComment {
  id?: string;
  username?: string;
  text?: string;
  timestamp?: number | string;
  additionalData?: { appRating?: number };
  attachment?: { mediaUrl?: string; mimeType?: string };
  subComments?: PostComment[];
}
export function loadSocialPost(postId: string, serviceIdentifier: string, signal?: AbortSignal) {
  return ccmApi.get<SocialPost>("/social-media-post", {
    signal,
    searchParams: { postId, serviceIdentifier, limit: 4 },
  });
}

function parseRoles(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string")
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  return [];
}

function asLinks(body: unknown): QuickLink[] {
  const root = body as { data?: unknown[]; quickLinks?: unknown[]; docs?: unknown[] } | unknown[] | null;
  const list = Array.isArray(root)
    ? root
    : Array.isArray(root?.data)
      ? root.data
      : Array.isArray(root?.quickLinks)
        ? root.quickLinks
        : Array.isArray(root?.docs)
          ? root.docs
          : [];
  return list
    .filter((row) => !(row as { isDeleted?: boolean }).isDeleted)
    .map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id: String(item.id ?? item._id ?? item.url ?? crypto.randomUUID()),
        title: String(item.name ?? item.title ?? ""),
        url: String(item.url ?? ""),
        description: item.description ? String(item.description) : undefined,
        pinned: Boolean(item.isDefault),
        accessRoles: parseRoles(item.accessRoles),
      };
    });
}

export async function loadQuickLinks() {
  return asLinks(await unifiedAdminApi.get("/quick-links"));
}

export async function pinQuickLinks(ids: string[]) {
  await savePreferences({ pinned_quick_links: ids.map((id) => ({ _id: id })) });
}

export function pinnedLinkIds(prefsPinned: unknown): string[] {
  if (!Array.isArray(prefsPinned)) return [];
  return prefsPinned
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const row = item as { _id?: string; id?: string };
        return row._id ?? row.id ?? "";
      }
      return "";
    })
    .filter(Boolean);
}

export async function loadEmailSignature(
  channelIdentifier: string,
  agentName: string,
): Promise<EmailSignature> {
  try {
    const body = await ccmApi.get<{ response?: { signatureBody?: string }[] }>("/email-signatures", {
      searchParams: { channelIdentifier },
    });
    const signatureBody = body.response?.[0]?.signatureBody ?? "";
    if (!signatureBody) return { signatureBody: "", signatureBodyWithAgentName: "" };
    const doc = new DOMParser().parseFromString(signatureBody, "text/html");
    const img = doc.querySelector("img");
    if (img) {
      img.setAttribute("width", "140");
      img.setAttribute("height", "30");
    }
    const modified = doc.documentElement.outerHTML;
    return {
      signatureBody,
      signatureBodyWithAgentName: modified.replaceAll("{{AGENT_NAME}}", agentName),
    };
  } catch {
    return { signatureBody: "", signatureBodyWithAgentName: "" };
  }
}

export async function createSecureVideoLink(input: {
  agentId: string;
  agentName: string;
  agentExtension: string;
  customerId: string;
  customerName: string;
  agentPassword: string;
  conversationId: string;
  channelSession: unknown;
  serviceIdentifier?: string;
}) {
  return secureLinkApi.post<{ secureLink?: string }>("/link", {
    ...input,
    agentPassword: await encryptSecret(input.agentPassword),
  });
}

export function isSecureLinkConfigured() {
  return Boolean(getConfig().SECURE_LINK_URL);
}
