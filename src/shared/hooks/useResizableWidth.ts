import { useCallback, useState, type PointerEvent as ReactPointerEvent } from "react";
import { localStore } from "@/core/storage/storage";

interface UseResizableWidthOptions {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  direction?: "left" | "right"; // 'right' expands to the right (left panels), 'left' expands to the left (right panels)
}

export function useResizableWidth({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  direction = "right",
}: UseResizableWidthOptions) {
  const [width, setWidth] = useState<number>(() => {
    const saved = Number(localStore.getString(storageKey));
    return Number.isFinite(saved) && saved >= minWidth && saved <= maxWidth ? saved : defaultWidth;
  });
  const [isDragging, setIsDragging] = useState(false);

  const resetWidth = useCallback(() => {
    setWidth(defaultWidth);
    localStore.setString(storageKey, String(defaultWidth));
  }, [defaultWidth, storageKey]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(true);
      const startX = event.clientX;
      const startWidth = width;
      const rtl = document.documentElement.dir === "rtl";
      const factor = (direction === "right" ? 1 : -1) * (rtl ? -1 : 1);

      const onPointerMove = (e: PointerEvent) => {
        const delta = (e.clientX - startX) * factor;
        const nextWidth = Math.min(maxWidth, Math.max(minWidth, Math.round(startWidth + delta)));
        setWidth(nextWidth);
        localStore.setString(storageKey, String(nextWidth));
      };

      const onPointerUp = () => {
        setIsDragging(false);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        document.body.style.removeProperty("cursor");
        document.body.style.removeProperty("user-select");
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [direction, maxWidth, minWidth, storageKey, width],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const step = event.shiftKey ? 32 : 12;
      if (event.key === "Home") {
        event.preventDefault();
        setWidth(minWidth);
        localStore.setString(storageKey, String(minWidth));
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setWidth(maxWidth);
        localStore.setString(storageKey, String(maxWidth));
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const rtl = document.documentElement.dir === "rtl";
      const factor =
        (event.key === "ArrowRight" ? 1 : -1) * (direction === "right" ? 1 : -1) * (rtl ? -1 : 1);
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, width + step * factor));
      setWidth(nextWidth);
      localStore.setString(storageKey, String(nextWidth));
    },
    [direction, maxWidth, minWidth, storageKey, width],
  );

  return {
    width,
    isDragging,
    onPointerDown,
    onKeyDown,
    onDoubleClick: resetWidth,
    resetWidth,
  };
}
