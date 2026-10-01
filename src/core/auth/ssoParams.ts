import type { ExternalServiceLoginPayload, FinesseLoginPayload } from "./types";

/**
 * URL-parameter SSO, identical contract to unified-agent isLoggedInService.autoLogin:
 *  - Cisco Finesse gadget: username(b64), password(b64) | authToken, ext, authWithSSO, roles
 *  - External CRM:         source=dynamics365|salesforce, token, url, roles
 * Parameters are stripped from the address bar right after reading so credentials
 * never linger in history or get copied with the URL.
 */
export type SsoRequest =
  | { kind: "finesse"; payload: Omit<FinesseLoginPayload, "finesseUrl">; extension: string }
  | { kind: "external"; payload: ExternalServiceLoginPayload }
  | null;

const SSO_KEYS = [
  "username",
  "password",
  "authToken",
  "ext",
  "authWithSSO",
  "roles",
  "source",
  "token",
  "url",
];

function safeAtob(value: string): string {
  try {
    return atob(value);
  } catch {
    return value;
  }
}

function safeJson<T>(value: string | null, fallback: T): T {
  if (value === null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function readSsoRequest(search: string = globalThis.location.search): SsoRequest {
  const params = new URLSearchParams(search);

  if (
    params.has("username") &&
    params.has("authWithSSO") &&
    params.has("ext") &&
    (params.has("password") || params.has("authToken"))
  ) {
    const authWithSSO = safeJson<boolean>(params.get("authWithSSO"), false);
    const username = safeAtob(params.get("username") ?? "");
    const password = safeAtob(params.get("password") ?? "");
    const authToken = params.get("authToken") ?? "";
    return {
      kind: "finesse",
      extension: params.get("ext") ?? "",
      payload: {
        username,
        roles: safeJson<unknown>(params.get("roles"), null),
        password: authWithSSO ? "" : password,
        authToken: authWithSSO ? authToken : "",
        authWithSSO,
      },
    };
  }

  const source = params.get("source")?.toLowerCase();
  if ((source === "dynamics365" || source === "salesforce") && params.has("token")) {
    const rolesRaw = params.get("roles") ?? "";
    return {
      kind: "external",
      payload: {
        validationToken: params.get("token") ?? "",
        url: params.get("url") ?? "",
        userRoles: rolesRaw
          ? rolesRaw
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean)
          : [],
        source,
      },
    };
  }
  return null;
}

/** FCM key handed over by the mobile wrapper (?fcm-key=). */
export function readFcmKey(search: string = globalThis.location.search): string | null {
  return new URLSearchParams(search).get("fcm-key");
}

export function stripSsoParams(): void {
  const url = new URL(globalThis.location.href);
  let changed = false;
  for (const key of SSO_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) globalThis.history.replaceState(globalThis.history.state, "", url.toString());
}
