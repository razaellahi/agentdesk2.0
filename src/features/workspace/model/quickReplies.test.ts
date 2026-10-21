import { describe, expect, it } from "vitest";
import { filterQuickReplies, highlightParts, topTags } from "./quickReplies";

const reply = (id: string, message: string, ...tags: string[]) => ({ id, message, tags });
const replies = [
  reply("a", "Thanks for waiting, I am checking.", "hold", "wait"),
  reply("b", "Your refund takes 5 days.", "refund", "billing"),
  reply("c", "We refund within a week of the hold ending.", "billing"),
  reply("d", "Hello and welcome!", "greeting"),
];

describe("filterQuickReplies", () => {
  it("keeps the agent's order when nothing is typed", () => {
    expect(filterQuickReplies(replies, "", null).map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("puts tag matches before message matches", () => {
    // "refund" is b's tag and only a word in c's message.
    expect(filterQuickReplies(replies, "refund", null).map((r) => r.id)).toEqual(["b", "c"]);
  });

  it("finds part of a tag and needs every word", () => {
    expect(filterQuickReplies(replies, "bill", null).map((r) => r.id)).toEqual(["b", "c"]);
    expect(filterQuickReplies(replies, "billing hold", null).map((r) => r.id)).toEqual(["c"]);
  });

  it("narrows to a tag, whatever its case", () => {
    expect(filterQuickReplies(replies, "", "BILLING").map((r) => r.id)).toEqual(["b", "c"]);
    expect(filterQuickReplies(replies, "week", "billing").map((r) => r.id)).toEqual(["c"]);
  });
});

describe("topTags", () => {
  it("lists the most used first", () => {
    expect(topTags(replies, 3)).toEqual(["billing", "greeting", "hold"]);
  });
});

describe("highlightParts", () => {
  it("marks each typed word where it appears", () => {
    expect(highlightParts("Refund in 5 days, refund fast", "refund")).toEqual([
      { text: "Refund", match: true },
      { text: " in 5 days, ", match: false },
      { text: "refund", match: true },
      { text: " fast", match: false },
    ]);
  });

  it("returns the text whole when there is nothing to mark, and survives symbols", () => {
    expect(highlightParts("a (b)", "")).toEqual([{ text: "a (b)", match: false }]);
    expect(highlightParts("a (b)", "(")).toEqual([
      { text: "a ", match: false },
      { text: "(", match: true },
      { text: "b)", match: false },
    ]);
  });
});
