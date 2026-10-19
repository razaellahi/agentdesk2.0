import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useDeskSettingsStore } from "@/core/agent-settings";
import { useSessionStore } from "@/core/auth";
import { navItemById } from "../navigation/navConfig";
import { navItemAccess } from "../navigation/useNavigation";
import { ForbiddenPage } from "../pages/ForbiddenPage";

export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const location = useLocation();
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return children;
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const location = useLocation();
  if (status === "authenticated") {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== "/login" ? from : "/"} replace />;
  }
  return children;
}

/** Guards a module route with the same rule that shows its navigation entry. */
export function RequireNavItem({ id, children }: { id: string; children: ReactNode }) {
  const user = useSessionStore((s) => s.user);
  const realmRoles = useSessionStore((s) => s.realmRoles);
  const clientRoles = useSessionStore((s) => s.clientRoles);
  const settings = useDeskSettingsStore((s) => s.settings);
  const access = navItemAccess(navItemById(id), { user, realmRoles, clientRoles }, settings);
  if (access !== "allowed") return <ForbiddenPage reason={access} />;
  return children;
}
