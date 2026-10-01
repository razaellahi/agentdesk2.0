import { create } from "zustand";
import { localStore } from "@/core/storage/storage";
import { contrastRatio, shade } from "./contrast";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type Density = "comfortable" | "compact";

/** Un-namespaced mirror read by the pre-paint script in index.html (tenant unknown then). */
export const PREPAINT_KEY = "ad2:theme";

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  density: Density;
  brandPrimary: string | null;
  setPreference(preference: ThemePreference): void;
  setDensity(density: Density): void;
  setBrandPrimary(hex: string | null): void;
  /** Called by the system media listener. */
  syncSystem(): void;
}

const media = () => globalThis.matchMedia?.("(prefers-color-scheme: dark)");

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") return media()?.matches ? "dark" : "light";
  return preference;
}

function applyBrand(primary: string | null, theme: ResolvedTheme) {
  const root = document.documentElement.style;
  if (!primary) {
    root.removeProperty("--primary");
    root.removeProperty("--primary-h");
    root.removeProperty("--primary-lt");
    return;
  }
  // Brand colours must keep text readable on surfaces in both themes; otherwise keep EF blue.
  const surface = theme === "dark" ? "#1d1f22" : "#ffffff";
  const candidate = theme === "dark" ? shade(primary, 0.35) : primary;
  if (contrastRatio(candidate, surface) < 4.5) {
    applyBrand(null, theme);
    return;
  }
  root.setProperty("--primary", candidate);
  root.setProperty("--primary-h", shade(candidate, theme === "dark" ? 0.12 : -0.1));
  root.setProperty("--primary-lt", theme === "dark" ? shade(primary, -0.72) : shade(primary, 0.9));
}

function apply(state: Pick<ThemeState, "resolved" | "density" | "brandPrimary">) {
  const root = document.documentElement;
  root.dataset.theme = state.resolved;
  root.dataset.density = state.density;
  applyBrand(state.brandPrimary, state.resolved);
  try {
    localStorage.setItem(PREPAINT_KEY, state.resolved);
  } catch {
    /* ignore */
  }
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  preference: "system",
  resolved: resolve("system"),
  density: "comfortable",
  brandPrimary: null,
  setPreference(preference) {
    localStore.setString("theme", preference);
    const resolved = resolve(preference);
    set({ preference, resolved });
    apply({ ...get(), resolved });
  },
  setDensity(density) {
    localStore.setString("density", density);
    set({ density });
    apply(get());
  },
  setBrandPrimary(brandPrimary) {
    set({ brandPrimary });
    apply(get());
  },
  syncSystem() {
    if (get().preference !== "system") return;
    const resolved = resolve("system");
    set({ resolved });
    apply({ ...get(), resolved });
  },
}));

/**
 * Initialises the theme once the tenant is known. Order: user's saved choice
 * (per tenant) > DEFAULT_THEME from config.
 */
export function initTheme(defaultTheme: ThemePreference): () => void {
  const saved = localStore.getString("theme") as ThemePreference | null;
  const density = (localStore.getString("density") as Density | null) ?? "comfortable";
  const preference = saved && ["light", "dark", "system"].includes(saved) ? saved : defaultTheme;
  useThemeStore.setState({ preference, resolved: resolve(preference), density });
  apply(useThemeStore.getState());

  const mq = media();
  const listener = () => useThemeStore.getState().syncSystem();
  mq?.addEventListener("change", listener);
  return () => mq?.removeEventListener("change", listener);
}

export const useResolvedTheme = () => useThemeStore((s) => s.resolved);
