/** Normalised error for every backend call, whatever shape the service returned. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly data: unknown;

  constructor(message: string, status: number, code: string | null = null, data: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

function pick(obj: unknown, ...paths: string[][]): unknown {
  for (const path of paths) {
    let cur: unknown = obj;
    for (const key of path) {
      if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[key];
      } else {
        cur = undefined;
        break;
      }
    }
    if (typeof cur === "string" && cur.trim()) return cur;
  }
  return undefined;
}

/**
 * EF services nest error text differently (agent-manager: error.error_message,
 * unified-admin: message, VRS: error.code). Extract the most specific one.
 */
export function messageFromBody(body: unknown, fallback: string): { message: string; code: string | null } {
  const message = pick(
    body,
    ["error", "error_message"],
    ["error_message"],
    ["error", "message"],
    ["message"],
    ["error", "error_detail", "reason"],
    ["error_description"],
    ["error"],
  );
  const code = pick(body, ["code"], ["error", "code"], ["errorCode"]);
  return { message: (message as string) ?? fallback, code: (code as string) ?? null };
}
