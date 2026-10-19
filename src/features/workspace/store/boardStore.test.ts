import { beforeEach, describe, expect, it } from "vitest";
import { setConfig } from "@/config";
import { makeConfig } from "@/test/fixtures";
import { useBoardStore } from "./boardStore";

const board = () => useBoardStore.getState();

describe("chat board", () => {
  beforeEach(() => {
    setConfig(makeConfig({ feature_multiPaneBoard: true }));
    board().reset();
  });

  it("opens in the focused pane and adds panes only for side-by-side selection", () => {
    board().open("a");
    board().open("b");
    expect(board().panes).toEqual(["b"]);
    board().openBeside("c");
    expect(board().panes).toEqual(["b", "c"]);
    expect(board().focus).toBe(1);
    // Opening one already on the board only focuses it.
    board().open("b");
    expect(board().panes).toEqual(["b", "c"]);
    expect(board().focus).toBe(0);
  });

  it("inserts beside the focused pane and closes panes without leaving gaps", () => {
    board().open("a");
    board().openBeside("b");
    board().focusPane(0);
    board().openBeside("c");
    expect(board().panes).toEqual(["a", "c", "b"]);
    board().remove("c");
    expect(board().panes).toEqual(["a", "b"]);
    board().close(0);
    expect(board().panes).toEqual(["b"]);
    expect(board().focus).toBe(0);
  });

  it("on a full board replaces the least recently used unpinned pane and can undo it", () => {
    board().open("a");
    board().openBeside("b");
    board().openBeside("c");
    board().focusPane(1);
    board().focusPane(2);
    const result = board().openBeside("d");
    expect(result).toMatchObject({ ok: true, replaced: "a" });
    expect(board().panes).toEqual(["d", "b", "c"]);
    if (result.ok) board().restore(result.previous, "c");
    expect(board().panes).toEqual(["a", "b", "c"]);
    expect(board().focus).toBe(2);
  });

  it("never replaces pinned panes", () => {
    board().open("a");
    board().openBeside("b");
    board().openBeside("c");
    board().togglePin("a");
    board().togglePin("b");
    // c is focused, a and b are pinned: nothing may give way.
    expect(board().openBeside("d")).toEqual({ ok: false, reason: "pinned" });
    board().togglePin("c");
    board().togglePin("c");
    board().focusPane(0);
    expect(board().openBeside("d")).toMatchObject({ ok: true, replaced: "c" });
  });

  it("respects runtime limits and a disabled feature", () => {
    setConfig(makeConfig({ feature_multiPaneBoard: true, MAX_BOARD_PANES: 2 }));
    board().open("a");
    board().openBeside("b");
    expect(board().openBeside("c")).toMatchObject({ ok: true, replaced: "a" });
    expect(board().panes).toHaveLength(2);
    setConfig(makeConfig({ feature_multiPaneBoard: false }));
    board().reset();
    board().open("a");
    board().openBeside("b");
    expect(board().panes).toEqual(["b"]);
  });

  it("drops conversations that end", () => {
    board().open("a");
    board().openBeside("b");
    board().reconcile(["b"]);
    expect(board().panes).toEqual(["b"]);
    expect(board().focus).toBe(0);
  });
});
