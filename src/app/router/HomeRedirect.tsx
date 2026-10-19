import { Navigate } from "react-router";
import { usePreferences } from "@/core/agent-settings";
import { useSessionStore } from "@/core/auth";
import { ALL_NAV_ITEMS } from "../navigation/navConfig";
import { legacyHashTarget, mapLegacyPath } from "../navigation/legacyRoutes";
import { isNavItemAvailable, useNavigation } from "../navigation/useNavigation";
import { EmptyWorkspace } from "../pages/EmptyWorkspace";

/**
 * Landing route: legacy #/hash deep link > saved home page (agentSetting.home_page,
 * old or new path) > first permitted module.
 */
export function HomeRedirect() {
  const sections = useNavigation();
  const prefs = usePreferences();
  const user = useSessionStore((s) => s.user);
  const realmRoles = useSessionStore((s) => s.realmRoles);
  const clientRoles = useSessionStore((s) => s.clientRoles);

  const permitted = (path: string | null) => {
    if (!path) return false;
    const item = ALL_NAV_ITEMS.find((i) => i.path === path);
    return Boolean(item && isNavItemAvailable(item, { user, realmRoles, clientRoles }));
  };

  const legacy = legacyHashTarget();
  if (permitted(legacy)) return <Navigate to={legacy!} replace />;

  const home = mapLegacyPath(prefs?.home_page);
  if (permitted(home)) return <Navigate to={home!} replace />;

  const first = sections[0]?.items[0];
  if (first) return <Navigate to={first.path} replace />;
  return <EmptyWorkspace />;
}
