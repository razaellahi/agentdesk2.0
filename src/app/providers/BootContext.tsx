import { createContext, useContext, type ReactNode } from "react";
import type { BootContext as BootContextValue } from "../bootstrap";

const Ctx = createContext<BootContextValue | null>(null);

export function BootContextProvider({ value, children }: { value: BootContextValue; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBootContext(): BootContextValue {
  const value = useContext(Ctx);
  if (!value) throw new Error("useBootContext outside BootContextProvider");
  return value;
}
