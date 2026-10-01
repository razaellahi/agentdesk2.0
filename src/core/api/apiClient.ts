import ky, { HTTPError, type Options } from "ky";
import { getConfig, type RuntimeConfig } from "@/config";
import { getTenantId } from "@/core/tenant/tenantStore";
import { ApiError, messageFromBody } from "./errors";

/**
 * Auth hooks are injected by core/auth at startup so this module stays free of
 * auth state (core/auth itself uses these clients to log in).
 */
export interface ApiAuthBridge {
  getAccessToken(): string | null;
  getAgentId(): string | null;
  /** Refreshes the access token; resolves true on success. Must de-duplicate concurrent calls. */
  refresh(): Promise<boolean>;
  /** Called when a request is still unauthorised after a refresh. */
  onUnauthorized(): void;
}

let bridge: ApiAuthBridge = {
  getAccessToken: () => null,
  getAgentId: () => null,
  refresh: async () => false,
  onUnauthorized: () => {},
};

export function configureApiAuth(next: ApiAuthBridge): void {
  bridge = next;
}

type ServiceKey = Extract<keyof RuntimeConfig, `${string}_URL`>;

export interface RequestOptions {
  searchParams?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** false for public endpoints (login, locale-setting, translations). Default true. */
  auth?: boolean;
  signal?: AbortSignal;
  timeout?: number;
  /** Extra tenant headers some services expect (unified-admin: Tenant/tenant/tenantid). */
  legacyTenantHeaders?: boolean;
  /** Override the tenantid header value (VRS uses VRS_TENANT_HEADER). */
  tenantHeader?: string;
}

type Body = unknown;

function cleanParams(params?: RequestOptions["searchParams"]) {
  if (!params) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) out[k] = String(v);
  return out;
}

function buildHeaders(opts: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = { ...opts.headers };
  const tenant = opts.tenantHeader ?? getTenantId();
  if (tenant) {
    headers.tenantid = tenant;
    if (opts.legacyTenantHeaders) {
      headers.Tenant = tenant;
      headers.tenant = tenant;
    }
  }
  if (opts.auth !== false) {
    const token = bridge.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const agentId = bridge.getAgentId();
    if (agentId) headers.agentId = agentId;
  }
  return headers;
}

async function toApiError(error: unknown): Promise<ApiError> {
  if (error instanceof ApiError) return error;
  if (error instanceof HTTPError) {
    let body: unknown = error.data;
    if (body === undefined) {
      try {
        body = await error.response.clone().json();
      } catch {
        body = undefined;
      }
    }
    const { message, code } = messageFromBody(
      body,
      error.response.statusText || `HTTP ${error.response.status}`,
    );
    return new ApiError(message, error.response.status, code, body);
  }
  if (error instanceof DOMException && error.name === "AbortError")
    return new ApiError("Request aborted", 0, "ABORTED");
  return new ApiError((error as Error)?.message || "Network error", 0, "NETWORK");
}

export type ResponseKind = "json" | "text" | "blob" | "none";

/** A client bound to one backend service URL from config.json. */
export function createServiceClient(service: ServiceKey | (() => string)) {
  const baseUrl = () =>
    typeof service === "function" ? service() : (getConfig()[service] as string | undefined);

  async function send<T>(method: string, path: string, body: Body, opts: RequestOptions, kind: ResponseKind) {
    const base = baseUrl();
    if (!base) throw new ApiError(`Service URL ${String(service)} is not configured`, 0, "NOT_CONFIGURED");
    const url = /^https?:\/\//.test(path) ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

    const attempt = () => {
      const options: Options = {
        method,
        headers: buildHeaders(opts),
        searchParams: cleanParams(opts.searchParams),
        signal: opts.signal,
        timeout: opts.timeout ?? 30_000,
        retry: method === "GET" ? { limit: 2, statusCodes: [408, 502, 503, 504] } : 0,
      };
      if (body instanceof FormData || body instanceof Blob) options.body = body;
      else if (body !== undefined) options.json = body;
      return ky(url, options);
    };

    let response: Response;
    try {
      response = await attempt();
    } catch (error) {
      const apiError = await toApiError(error);
      if (!apiError.isUnauthorized || opts.auth === false) throw apiError;
      // One refresh + one retry, then give up and end the session.
      const refreshed = await bridge.refresh().catch(() => false);
      if (!refreshed) {
        bridge.onUnauthorized();
        throw apiError;
      }
      try {
        response = await attempt();
      } catch (retryError) {
        const retryApiError = await toApiError(retryError);
        if (retryApiError.isUnauthorized) bridge.onUnauthorized();
        throw retryApiError;
      }
    }

    if (kind === "none" || response.status === 204) return undefined as T;
    if (kind === "blob") return (await response.blob()) as T;
    const text = await response.text();
    if (kind === "text") return text as T;
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // Some EF endpoints answer JSON routes with plain text ("updated").
      return text as T;
    }
  }

  return {
    get: <T>(path: string, opts: RequestOptions = {}, kind: ResponseKind = "json") =>
      send<T>("GET", path, undefined, opts, kind),
    delete: <T>(path: string, opts: RequestOptions = {}, kind: ResponseKind = "json") =>
      send<T>("DELETE", path, undefined, opts, kind),
    post: <T>(path: string, body?: Body, opts: RequestOptions = {}, kind: ResponseKind = "json") =>
      send<T>("POST", path, body, opts, kind),
    put: <T>(path: string, body?: Body, opts: RequestOptions = {}, kind: ResponseKind = "json") =>
      send<T>("PUT", path, body, opts, kind),
    patch: <T>(path: string, body?: Body, opts: RequestOptions = {}, kind: ResponseKind = "json") =>
      send<T>("PATCH", path, body, opts, kind),
    url: (path = "") => `${baseUrl() ?? ""}${path}`,
  };
}

export type ServiceClient = ReturnType<typeof createServiceClient>;
