import { describe, expect, it } from "vitest";
import { MIN_PANE, STRIP, visiblePanes } from "./visiblePanes";

describe("visiblePanes", () => {
  it("shows every pane when they fit", () => {
    expect(visiblePanes(3, 0, MIN_PANE * 3)).toEqual({ start: 0, end: 3 });
  });

  it("folds the rest when space is short, keeping the focused pane in view", () => {
    const width = MIN_PANE * 2 + STRIP; // room for two panes and the strip
    expect(visiblePanes(3, 0, width)).toEqual({ start: 0, end: 2 });
    expect(visiblePanes(3, 2, width)).toEqual({ start: 1, end: 3 });
    expect(visiblePanes(3, 1, width)).toEqual({ start: 0, end: 2 });
  });

  it("always shows at least the focused pane", () => {
    expect(visiblePanes(3, 2, 300)).toEqual({ start: 2, end: 3 });
  });

  it("does not fold before the board has been measured or with one pane", () => {
    expect(visiblePanes(3, 1, 0)).toEqual({ start: 0, end: 3 });
    expect(visiblePanes(1, 0, 200)).toEqual({ start: 0, end: 1 });
  });
});
