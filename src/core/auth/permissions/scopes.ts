import type { KeycloakUser } from "../types";

export interface PermissionSubject {
  user: Pick<KeycloakUser, "roles" | "permittedResources"> | null;
  realmRoles: string[];
  /** Token client roles (resource_access); optional for callers that only know realm roles. */
  clientRoles?: string[];
}

/** Keycloak UMA check: does the user hold `scope` on resource `rsname`? (unified-agent AuthService.checkScope) */
export function hasScope(subject: PermissionSubject, resource: string, scope: string): boolean {
  const resources = subject.user?.permittedResources?.Resources ?? [];
  const want = resource.trim();
  const wantScope = scope.trim();
  return resources.some((r) => r.rsname?.trim() === want && r.scopes?.some((s) => s.trim() === wantScope));
}

/** True if any listed scope is held on the resource. */
export function hasAnyScope(subject: PermissionSubject, resource: string, scopes: string[]): boolean {
  return scopes.some((scope) => hasScope(subject, resource, scope));
}

/** Client roles on keycloak_User.roles plus realm roles from the token. */
export function hasRole(subject: PermissionSubject, role: string): boolean {
  return Boolean(subject.user?.roles?.includes(role)) || subject.realmRoles.includes(role);
}
