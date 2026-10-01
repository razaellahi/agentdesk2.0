import { useSessionStore } from "../sessionStore";
import { PERMISSIONS, satisfies, type PermissionKey, type Requirement } from "./resources";
import { hasScope, type PermissionSubject } from "./scopes";

export function currentSubject(): PermissionSubject {
  const { user, realmRoles } = useSessionStore.getState();
  return { user, realmRoles };
}

export function can(permission: PermissionKey | Requirement): boolean {
  const req = typeof permission === "string" ? PERMISSIONS[permission] : permission;
  return satisfies(currentSubject(), req);
}

/** Re-renders when the session (user / token roles) changes. */
export function usePermission(permission: PermissionKey | Requirement | undefined): boolean {
  const user = useSessionStore((s) => s.user);
  const realmRoles = useSessionStore((s) => s.realmRoles);
  if (!permission) return true;
  const req = typeof permission === "string" ? PERMISSIONS[permission] : permission;
  return satisfies({ user, realmRoles }, req);
}

/** Ad-hoc resource/scope check for fine-grained UI (e.g. agent-conversation-control:view_consult). */
export function useScope(resource: string, scope: string): boolean {
  const user = useSessionStore((s) => s.user);
  const realmRoles = useSessionStore((s) => s.realmRoles);
  return hasScope({ user, realmRoles }, resource, scope);
}
