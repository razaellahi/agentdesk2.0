import { create } from "zustand";
import { focusedOverlayContainer } from "@/components/ui/portal-container";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  container?: HTMLElement;
  /** Names the question so whoever asked can withdraw it (dismissConfirm). */
  id?: string;
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

/** Withdraws a pending confirmation, answered as "no", when what it asked about is gone. */
export function dismissConfirm(id: string) {
  if (useConfirmStore.getState().request?.id === id) useConfirmStore.getState().settle(false);
}
