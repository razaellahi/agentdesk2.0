import { agentManagerApi, ApiError, configureApiAuth } from "@/core/api";
import { createLogger } from "@/core/logging/logger";
import { getTenantId } from "@/core/tenant/tenantStore";
import { tenantOfUser } from "@/core/tenant/resolveTenant";
import { getSession, sessionPersistence, useSessionStore } from "./sessionStore";
import type {
  ExternalServiceLoginPayload,
  FinesseLoginPayload,
  LoginData,
  LoginMethod,
  LoginResponse,
  PasswordCredentials,
  TwoFAChannel,
} from "./types";

const log = createLogger("auth");

// ---------------------------------------------------------------------------
// Outcomes of a login attempt. The login UI drives 2FA / password change steps.
// ---------------------------------------------------------------------------

export type LoginOutcome =
  | { kind: "authenticated" }
  | {
      kind: "twoFactor";
      channel: TwoFAChannel;
      registered: boolean;
      qrImage?: string;
      otpSecret?: string;
      phoneNumber?: string;
      email?: string;
    }
  | { kind: "passwordChangeRequired"; userId: string | null };

export class TenantMismatchError extends Error {
  constructor(expected: string, actual: string) {
    super(`This account belongs to tenant "${actual}", not "${expected}".`);
    this.name = "TenantMismatchError";
  }
}

const PASSWORD_UPDATE = /password\s*update\s*required/i;

function isPasswordUpdateRequired(error: ApiError): { required: boolean; userId: string | null } {
  const body = error.data as Record<string, unknown> | null;
  const root = ((body?.error as Record<string, unknown>) ?? body ?? {}) as Record<string, unknown>;
  const reason = String((root.error_detail as Record<string, unknown> | undefined)?.reason ?? "");
  const message = String(root.error_message ?? root.message ?? error.message ?? "");
  const required =
    reason.toLowerCase().startsWith("password update required") || PASSWORD_UPDATE.test(message);
  const userId = ((root.user_details as Record<string, unknown> | undefined)?.userId as string) ?? null;
  return { required, userId };
}

// ---------------------------------------------------------------------------
// Session lifecycle hooks: realtime / telephony register teardown here so auth
// never imports them (dependency points inwards).
// ---------------------------------------------------------------------------

/** `reason` is the agent-manager logout reason code object (or a session-end reason string). */
type SessionHook = (reason: unknown) => void | Promise<void>;
const beforeLogoutHooks = new Set<SessionHook>();
const afterLoginHooks = new Set<(method: LoginMethod, credentials: Partial<PasswordCredentials>) => void>();

/** Runs before the session is cleared (e.g. SIP unregister, emit LOGOUT agent state). */
export function onBeforeLogout(hook: SessionHook): () => void {
  beforeLogoutHooks.add(hook);
  return () => beforeLogoutHooks.delete(hook);
}

/** Runs after a fresh login (not after a reload restore). */
export function onAfterLogin(hook: (method: LoginMethod, credentials: Partial<PasswordCredentials>) => void) {
  afterLoginHooks.add(hook);
  return () => afterLoginHooks.delete(hook);
}

// ---------------------------------------------------------------------------

function completeLogin(data: LoginData, method: LoginMethod, credentials: Partial<PasswordCredentials> = {}) {
  const tenant = getTenantId();
  const userTenant = tenantOfUser(data.keycloak_User);
  // Tenant ids come back either as a name or an opaque id; only a *named* mismatch is conclusive.
  if (
    tenant &&
    userTenant &&
    /[a-z]/i.test(userTenant) &&
    !/^[0-9a-f-]{20,}$/i.test(userTenant) &&
    userTenant !== tenant
  ) {
    throw new TenantMismatchError(tenant, userTenant);
  }
  useSessionStore.getState().startSession({
    user: data.keycloak_User,
    accessToken: data.token,
    refreshToken: data.refresh_token,
    method,
  });
  useSessionStore.getState().setPasswordExpiryMessage(data.passwordExpiration ?? null);
  afterLoginHooks.forEach((hook) => {
    try {
      hook(method, credentials);
    } catch (error) {
      log.error("afterLogin hook failed", error);
    }
  });
}

function twoFactorOutcome(data: LoginData): LoginOutcome {
  return {
    kind: "twoFactor",
    channel: (data.twoFAChannel?.toLowerCase() ?? "app") as TwoFAChannel,
    registered: Boolean(data.is2FARegistered),
    qrImage: data.qrImage,
    otpSecret: data.otpSecret,
    phoneNumber: data.phoneNumber,
    email: data.email,
  };
}

export async function loginWithPassword(credentials: PasswordCredentials): Promise<LoginOutcome> {
  try {
    const response = await agentManagerApi.post<LoginResponse>("/agent/login", credentials, { auth: false });
    if (response.data.is2FAEnabled) return twoFactorOutcome(response.data);
    completeLogin(response.data, "password", credentials);
    return { kind: "authenticated" };
  } catch (error) {
    if (error instanceof ApiError) {
      const { required, userId } = isPasswordUpdateRequired(error);
      if (required) return { kind: "passwordChangeRequired", userId };
    }
    throw error;
  }
}

export async function validateOtp(credentials: PasswordCredentials, otp: string): Promise<void> {
  const response = await agentManagerApi.post<LoginResponse>(
    "/agent/validate-otp",
    { ...credentials, otpToValidate: otp },
    { auth: false },
  );
  if (response.statusCode !== undefined && response.statusCode !== 200) {
    throw new ApiError("Invalid verification code", 401, "INVALID_OTP", response);
  }
  completeLogin(response.data, "password", credentials);
}

/** Registers the SMS number / email for 2FA, which sends the first code. */
export async function registerTwoFactor(
  credentials: PasswordCredentials,
  customerChannelId: string,
): Promise<void> {
  const response = await agentManagerApi.post<{ statusCode?: number }>(
    "/agent/register-2FA",
    { ...credentials, customerChannelId },
    { auth: false },
  );
  if (response?.statusCode !== undefined && response.statusCode !== 200) {
    throw new ApiError("Could not register two-factor authentication", 400);
  }
}

export async function resendOtp(username: string): Promise<void> {
  const response = await agentManagerApi.post<{ statusCode?: number }>(
    "/agent/resendOTP",
    { username },
    { auth: false },
  );
  if (response?.statusCode !== undefined && response.statusCode !== 200) {
    throw new ApiError("Could not resend the code", 400);
  }
}

export async function loginWithFinesse(payload: FinesseLoginPayload): Promise<void> {
  const response = await agentManagerApi.post<LoginResponse>("/agent/login", payload, { auth: false });
  completeLogin(response.data, "finesse", { username: payload.username, password: payload.password });
}

export async function loginWithExternalService(payload: ExternalServiceLoginPayload): Promise<void> {
  const response = await agentManagerApi.post<LoginResponse>("/agent/login", payload, { auth: false });
  completeLogin(response.data, "external");
}

// ---------------------------------------------------------------------------
// Password policy & change (forced or voluntary).
// ---------------------------------------------------------------------------

export interface PasswordPolicy {
  type: string;
  value: string;
}

export async function getPasswordPolicies(): Promise<PasswordPolicy[]> {
  const response = await agentManagerApi.get<{ data?: { policies?: PasswordPolicy[] } }>(
    "/agent/pswd-policies",
    {
      auth: false,
    },
  );
  return response?.data?.policies ?? [];
}

export async function changePassword(payload: {
  username: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await agentManagerApi.post("/agent/reset-pswd", payload, { auth: false }, "text");
}

// ---------------------------------------------------------------------------
// Token refresh: one in-flight request, everyone else awaits the same promise.
// ---------------------------------------------------------------------------

let refreshInFlight: Promise<boolean> | null = null;

export function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = sessionPersistence.readRefreshToken();
  if (!refreshToken) return Promise.resolve(false);

  refreshInFlight = agentManagerApi
    .post<{ data?: { access_token?: string; refresh_token?: string } }>(
      "/agent/refresh-token",
      { refreshToken },
      { auth: false },
    )
    .then((response) => {
      const token = response?.data?.access_token;
      if (!token) return false;
      useSessionStore.getState().setAccessToken(token, response.data?.refresh_token);
      return true;
    })
    .catch((error) => {
      log.warn("Token refresh failed", error);
      return false;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/**
 * Restores a session after a reload: the user object and refresh token survive in
 * (tenant-scoped) sessionStorage; the access token is re-issued via refresh.
 */
export async function restoreSession(): Promise<boolean> {
  const user = sessionPersistence.readUser();
  const refreshToken = sessionPersistence.readRefreshToken();
  if (!user?.id || !refreshToken) {
    useSessionStore.getState().markAnonymous();
    return false;
  }
  const ok = await refreshAccessToken();
  if (!ok) {
    useSessionStore.getState().endSession();
    return false;
  }
  const { accessToken } = getSession();
  useSessionStore.getState().startSession({
    user,
    accessToken: accessToken!,
    refreshToken: sessionPersistence.readRefreshToken() ?? refreshToken,
    method: sessionPersistence.readMethod() ?? "password",
  });
  return true;
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

let loggingOut = false;

/**
 * Ends the session. `reason` is an agent-state reason code / session-end reason
 * (e.g. SESSION_TIMEOUT_INACTIVITY). Teardown hooks run first so SIP unregister
 * and the LOGOUT agent state go out before credentials disappear.
 */
export async function logout(reason: unknown = null, endReason: string | null = null): Promise<void> {
  if (loggingOut) return;
  loggingOut = true;
  try {
    for (const hook of beforeLogoutHooks) {
      try {
        await hook(reason);
      } catch (error) {
        log.error("beforeLogout hook failed", error);
      }
    }
  } finally {
    useSessionStore.getState().endSession(endReason);
    loggingOut = false;
  }
}

/**
 * Ends the session immediately without server round-trips. `endReason` is shown
 * on the login page: "expired" (token rejected), "another-session" (socket
 * session removed), "forced" (supervisor), "inactivity".
 */
export function forceEndSession(endReason: string = "expired"): void {
  useSessionStore.getState().endSession(endReason);
}

/** Wires the API layer to this session. Called once during bootstrap. */
export function installApiAuth(): void {
  configureApiAuth({
    getAccessToken: () => getSession().accessToken,
    getAgentId: () => getSession().user?.id ?? null,
    refresh: refreshAccessToken,
    onUnauthorized: () => forceEndSession("expired"),
  });
}
