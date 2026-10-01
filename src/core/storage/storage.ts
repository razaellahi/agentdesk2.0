/**
 * Tenant-namespaced browser storage. Every key is stored as `ad2:{tenant}:{key}`
 * so two tenants opened in one browser never share session, drafts or layout,
 * and logout clears only the current tenant's keys.
 *
 * Storage can be unavailable (private mode, blocked site data): every access is
 * guarded and degrades to an in-memory map so the app still works.
 */
const PREFIX = "ad2";
let tenantId = "_";

export function setStorageTenant(id: string): void {
  tenantId = id || "_";
}

function scopedKey(key: string): string {
  return `${PREFIX}:${tenantId}:${key}`;
}

function fallbackStore(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

function resolve(kind: "session" | "local"): Storage {
  try {
    const store = kind === "session" ? globalThis.sessionStorage : globalThis.localStorage;
    const probe = `${PREFIX}:probe`;
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return fallbackStore();
  }
}

export interface ScopedStorage {
  get<T = unknown>(key: string): T | null;
  getString(key: string): string | null;
  set(key: string, value: unknown): void;
  setString(key: string, value: string): void;
  remove(key: string): void;
  /** Removes every key of the current tenant. */
  clearTenant(): void;
}

function createScopedStorage(kind: "session" | "local"): ScopedStorage {
  let backing: Storage | null = null;
  const store = () => (backing ??= resolve(kind));
  return {
    getString(key) {
      try {
        return store().getItem(scopedKey(key));
      } catch {
        return null;
      }
    },
    get<T>(key: string) {
      const raw = this.getString(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    setString(key, value) {
      try {
        store().setItem(scopedKey(key), value);
      } catch {
        /* quota or blocked: state stays in memory for this session */
      }
    },
    set(key, value) {
      this.setString(key, JSON.stringify(value));
    },
    remove(key) {
      try {
        store().removeItem(scopedKey(key));
      } catch {
        /* ignore */
      }
    },
    clearTenant() {
      try {
        const s = store();
        const prefix = `${PREFIX}:${tenantId}:`;
        const keys: string[] = [];
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          if (k?.startsWith(prefix)) keys.push(k);
        }
        keys.forEach((k) => s.removeItem(k));
      } catch {
        /* ignore */
      }
    },
  };
}

/** Per-tab state (auth session, drafts) — matches today's sessionStorage semantics. */
export const sessionStore = createScopedStorage("session");
/** Persistent per-browser preferences (theme before login, column layouts). */
export const localStore = createScopedStorage("local");
