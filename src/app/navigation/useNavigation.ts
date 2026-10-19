import { useMemo } from "react";
import { getConfig } from "@/config";
import { useDeskSettingsStore } from "@/core/agent-settings";
import { PERMISSIONS, satisfies, useSessionStore } from "@/core/auth";
import { NAV_SECTIONS, type NavItem, type NavSection } from "./navConfig";

/** Why a module can or cannot be opened: missing permission and switched-off features read differently. */
export type NavAccess = "allowed" | "forbidden" | "unavailable";

export function navItemAccess(
  item: NavItem,
  subject: Parameters<typeof satisfies>[0],
  settings = useDeskSettingsStore.getState().settings,
): NavAccess {
  if (item.permission && !satisfies(subject, PERMISSIONS[item.permission])) return "forbidden";
  if (item.enabled && !item.enabled({ config: getConfig(), settings })) return "unavailable";
  return "allowed";
}

export function isNavItemAvailable(
  item: NavItem,
  subject: Parameters<typeof satisfies>[0],
  settings = useDeskSettingsStore.getState().settings,
): boolean {
  return navItemAccess(item, subject, settings) === "allowed";
}

/** Navigation filtered by the current user's permissions, flags and desk settings. */
export function useNavigation(): NavSection[] {
  const user = useSessionStore((s) => s.user);
  const realmRoles = useSessionStore((s) => s.realmRoles);
  const clientRoles = useSessionStore((s) => s.clientRoles);
  const settings = useDeskSettingsStore((s) => s.settings);
  return useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !item.hidden && isNavItemAvailable(item, { user, realmRoles, clientRoles }, settings),
        ),
      })).filter((section) => section.items.length > 0),
    [user, realmRoles, clientRoles, settings],
  );
}
