import type { ReactNode } from "react";
import type { PermissionKey, Requirement } from "./resources";
import { usePermission } from "./usePermission";

interface CanProps {
  permission: PermissionKey | Requirement;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Renders children only when the current user satisfies the permission. */
export function Can({ permission, children, fallback = null }: CanProps) {
  return usePermission(permission) ? children : fallback;
}
