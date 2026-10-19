/** Narrowest a side-by-side pane may get before it folds into the strip. */
export const MIN_PANE = 320;
export const STRIP = 52;

/**
 * Which board panes fit beside each other. The focused pane always shows; the
 * window slides to keep it in view and the rest fold into the side strip, so the
 * board never scrolls sideways.
 */
export function visiblePanes(count: number, focus: number, width: number) {
  if (count <= 1 || width <= 0) return { start: 0, end: count };
  const fitsAll = Math.floor(width / MIN_PANE) >= count;
  if (fitsAll) return { start: 0, end: count };
  const capacity = Math.max(1, Math.floor((width - STRIP) / MIN_PANE));
  const start = Math.min(Math.max(0, focus - capacity + 1), count - capacity);
  return { start: Math.max(0, start), end: Math.max(0, start) + capacity };
}
