import { jwtDecode } from "jwt-decode";
import { create } from "zustand";
import { sessionStore as storage } from "@/core/storage/storage";
import type { KeycloakUser, LoginMethod } from "./types";

const KEYS = { user: "user", refreshToken: "refresh_token", method: "login_method" } as const;

export type SessionStatus = "unknown" | "anonymous" | "authenticated";

interface SessionState {
  status: SessionStatus;
  user: KeycloakUser | null;
  /** Kept in memory only; restored on reload through the refresh token. */
  accessToken: string | null;
  /** Realm roles from the access token (VRS: admin/supervisor/agent/download/export/viewtag/evaluatetag). */
  realmRoles: string[];
  /** Client roles from the access token (resource_access.*.roles; Case Management reads case-* roles here too). */
  clientRoles: string[];
  method: LoginMethod | null;
  passwordExpiryMessage: string | null;
  /** Why the last session ended when it was not a plain user logout (expired, another-session, inactivity…). */
  endReason: string | null;
}

interface SessionActions {
  startSession(input: {
    user: KeycloakUser;
    accessToken: string;
    refreshToken: string;
    method: LoginMethod;
  }): void;
  setAccessToken(token: string, refreshToken?: string): void;
  setPasswordExpiryMessage(message: string | null): void;
  endSession(endReason?: string | null): void;
  markAnonymous(): void;
}

export function realmRolesFromToken(token: string | null): string[] {
  if (!token) return [];
  try {
    const claims = jwtDecode<{ realm_access?: { roles?: string[] } }>(token);
    return claims.realm_access?.roles ?? [];
  } catch {
    return [];
  }
}

export function clientRolesFromToken(token: string | null): string[] {
  if (!token) return [];
  try {
    const claims = jwtDecode<{ resource_access?: Record<string, { roles?: string[] }> }>(token);
    return [...new Set(Object.values(claims.resource_access ?? {}).flatMap((client) => client.roles ?? []))];
  } catch {
    return [];
  }
}

export const useSessionStore = create<SessionState & SessionActions>()((set) => ({
  status: "unknown",
  user: null,
  accessToken: null,
  realmRoles: [],
  clientRoles: [],
  method: null,
  passwordExpiryMessage: null,
  endReason: null,

  startSession({ user, accessToken, refreshToken, method }) {
    storage.set(KEYS.user, user);
    storage.setString(KEYS.refreshToken, refreshToken);
    storage.setString(KEYS.method, method);
    set({
      status: "authenticated",
      user,
      accessToken,
      realmRoles: realmRolesFromToken(accessToken),
      clientRoles: clientRolesFromToken(accessToken),
      method,
      endReason: null,
    });
  },
  setAccessToken(token, refreshToken) {
    if (refreshToken) storage.setString(KEYS.refreshToken, refreshToken);
    set({
      accessToken: token,
      realmRoles: realmRolesFromToken(token),
      clientRoles: clientRolesFromToken(token),
    });
  },
  setPasswordExpiryMessage(message) {
    set({ passwordExpiryMessage: message });
  },
  endSession(endReason = null) {
    storage.remove(KEYS.user);
    storage.remove(KEYS.refreshToken);
    storage.remove(KEYS.method);
    set({
      status: "anonymous",
      user: null,
      accessToken: null,
      realmRoles: [],
      clientRoles: [],
      method: null,
      passwordExpiryMessage: null,
      endReason,
    });
  },
  markAnonymous() {
    set({ status: "anonymous" });
  },
}));

export const sessionPersistence = {
  readUser: () => storage.get<KeycloakUser>(KEYS.user),
  readRefreshToken: () => storage.getString(KEYS.refreshToken),
  readMethod: () => storage.getString(KEYS.method) as LoginMethod | null,
};

export const getSession = () => useSessionStore.getState();
export const useCurrentUser = () => useSessionStore((s) => s.user);
