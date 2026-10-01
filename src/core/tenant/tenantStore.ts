import { create } from "zustand";

export interface TenantBranding {
  /** Object URL / data URL of the tenant logo, or null to use the bundled EF logo. */
  logoUrl: string | null;
  displayName: string | null;
}

interface TenantState {
  tenantId: string;
  branding: TenantBranding;
  setTenant: (tenantId: string) => void;
  setBranding: (branding: Partial<TenantBranding>) => void;
}

export const useTenantStore = create<TenantState>()((set) => ({
  tenantId: "",
  branding: { logoUrl: null, displayName: null },
  setTenant: (tenantId) => set({ tenantId }),
  setBranding: (branding) => set((s) => ({ branding: { ...s.branding, ...branding } })),
}));

export const getTenantId = () => useTenantStore.getState().tenantId;
export const useTenantId = () => useTenantStore((s) => s.tenantId);
export const useTenantBranding = () => useTenantStore((s) => s.branding);
