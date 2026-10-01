import { useMemo } from "react";
import { getConfig } from "@/config";
import { useDeskSettingsStore } from "@/core/agent-settings";
import { PERMISSIONS, satisfies, useSessionStore } from "@/core/auth";
import { NAV_SECTIONS, type NavItem, type NavSection } from "./navConfig";

export function isNavItemAvailable(
  item: NavItem,
  subject: Parameters<typeof satisfies>[0],
  settings = useDeskSettingsStore.getState().settings,
): boolean {
  if (item.permission && !satisfies(subject, PERMISSIONS[item.permission])) return false;
  if (item.enabled && !item.enabled({ config: getConfig(), settings })) return false;
  return true;
}

/** Navigation filtered by the current user's permissions, flags and desk settings. */
export function useNavigation(): NavSection[] {
  const user = useSessionStore((s) => s.user);
  const realmRoles = useSessionStore((s) => s.realmRoles);
  const settings = useDeskSettingsStore((s) => s.settings);
  return useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => isNavItemAvailable(item, { user, realmRoles }, settings)),
      })).filter((section) => section.items.length > 0),
    [user, realmRoles, settings],
  );
}
