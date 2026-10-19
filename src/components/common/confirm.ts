import { create } from "zustand";
import { focusedOverlayContainer } from "@/components/ui/portal-container";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  container?: HTMLElement;
}

interface ConfirmState {
  request: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
  open(options: ConfirmOptions): Promise<boolean>;
  settle(ok: boolean): void;
}

export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  request: null,
  open(options) {
    get().request?.resolve(false);
    return new Promise<boolean>((resolve) => set({ request: { ...options, resolve } }));
  },
  settle(ok) {
    get().request?.resolve(ok);
    set({ request: null });
  },
}));

/** Imperative confirmation: `if (await confirm({ title })) …`. Rendered by <ConfirmHost/>. */
export const confirm = (options: ConfirmOptions) =>
  useConfirmStore.getState().open({ container: focusedOverlayContainer(), ...options });
