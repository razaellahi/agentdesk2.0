import { useCallback, useState } from "react";

const MIN_WIDTH = 96;
const MAX_WIDTH = 640;

function read(key: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Column widths the agent dragged, kept per user in this browser (a convenience, never required). */
export function useColumnWidths(userId: string | undefined) {
  const key = `phonebook:widths:${userId ?? "anonymous"}`;
  const [widths, setWidths] = useState<Record<string, number>>(() => read(key));

  const resize = useCallback((field: string, width: number) => {
    const next = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)));
    setWidths((current) => ({ ...current, [field]: next }));
  }, []);

  /** Called when a drag ends: remember the sizes. */
  const commit = useCallback(() => {
    setWidths((current) => {
      try {
        localStorage.setItem(key, JSON.stringify(current));
      } catch {
        /* storage blocked: widths last for this visit */
      }
      return current;
    });
  }, [key]);

  const reset = useCallback(() => {
    setWidths({});
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);

  return { widths, resize, commit, reset };
}
