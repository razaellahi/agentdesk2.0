import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { create } from "zustand";
import { createLogger } from "@/core/logging/logger";
import { getCimCustomer, resolveUserDisplayNames } from "../api";
import { cimCustomerDisplayName } from "../model/customer";

const log = createLogger("cases");

/**
 * Keycloak user ids and CIM profile ids resolved to names once per session
 * (case-console UserDisplayService / CustomerDisplayService): batched, cached, best-effort.
 */
interface NamesState {
  users: Record<string, string>;
  customers: Record<string, string>;
}

const useNamesStore = create<NamesState>()(() => ({ users: {}, customers: {} }));

const pendingUsers = new Set<string>();
const requestedUsers = new Set<string>();
const requestedCustomers = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushUsers() {
  flushTimer = null;
  const ids = [...pendingUsers].slice(0, 50);
  ids.forEach((id) => pendingUsers.delete(id));
  if (pendingUsers.size) flushTimer = setTimeout(flushUsers, 80);
  if (!ids.length) return;
  resolveUserDisplayNames(ids)
    .then((rows) => {
      const users = { ...useNamesStore.getState().users };
      for (const u of rows) users[u.userId] = u.displayName?.trim() || u.username?.trim() || u.userId;
      useNamesStore.setState({ users });
    })
    .catch((error: unknown) => log.debug("resolveUserDisplayNames failed", error));
}

export function primeUserNames(ids: (string | null | undefined)[]) {
  const known = useNamesStore.getState().users;
  let added = false;
  for (const id of ids) {
    if (!id || id === "system" || known[id] || requestedUsers.has(id)) continue;
    requestedUsers.add(id);
    pendingUsers.add(id);
    added = true;
  }
  if (added && !flushTimer) flushTimer = setTimeout(flushUsers, 80);
}

export function primeCustomerNames(entries: { id: string | null | undefined; hint?: string | null }[]) {
  const known = useNamesStore.getState().customers;
  for (const { id: raw, hint } of entries) {
    const id = raw?.trim();
    if (!id || known[id]) continue;
    const name = hint?.trim();
    if (name && name !== id) {
      useNamesStore.setState((s) => ({ customers: { ...s.customers, [id]: name } }));
      continue;
    }
    if (requestedCustomers.has(id)) continue;
    requestedCustomers.add(id);
    getCimCustomer(id)
      .then((doc) => {
        const resolved = doc ? cimCustomerDisplayName(doc) : null;
        if (resolved && resolved !== id)
          useNamesStore.setState((s) => ({ customers: { ...s.customers, [id]: resolved } }));
      })
      .catch((error: unknown) => log.debug("CIM customer lookup failed", error));
  }
}

/** `label(userId)`: "You" for the current agent, the resolved name, or a shortened id meanwhile. */
export function useUserLabel(currentUserId?: string | null, ids: (string | null | undefined)[] = []) {
  const { t } = useTranslation();
  const users = useNamesStore((s) => s.users);
  const key = ids.join("|");
  useEffect(() => {
    primeUserNames(key ? key.split("|") : []);
  }, [key]);
  return useCallback(
    (userId: string | null | undefined) => {
      if (!userId) return "—";
      if (userId === "system") return t("cases.system");
      if (currentUserId && userId === currentUserId) return t("cases.you");
      const name = users[userId];
      if (name) return name;
      primeUserNames([userId]);
      return userId.length > 12 ? `${userId.slice(0, 8)}…` : userId;
    },
    [users, currentUserId, t],
  );
}

export function useCustomerLabel() {
  const customers = useNamesStore((s) => s.customers);
  return useCallback(
    (profileId: string | null | undefined, hint?: string | null) => {
      const id = profileId?.trim();
      if (!id) return hint?.trim() || "—";
      const cached = customers[id];
      if (cached) return cached;
      const name = hint?.trim();
      if (name && name !== id) return name;
      primeCustomerNames([{ id }]);
      return id;
    },
    [customers],
  );
}

/** Test seam. */
export function resetDisplayNames() {
  pendingUsers.clear();
  requestedUsers.clear();
  requestedCustomers.clear();
  useNamesStore.setState({ users: {}, customers: {} });
}
