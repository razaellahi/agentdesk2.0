import { describe, expect, it } from "vitest";
import { demoQuickReplies, refineDemoText } from "./composerAssist";

describe("refineDemoText", () => {
  it("fixes slips, capitalises sentences and closes politely", () => {
    const refined = refineDemoText("hi, pls send me ur order number  thx");
    expect(refined).toBe(
      "Hi, please send me your order number thank you. Please let me know if there is anything else I can help you with.",
    );
  });

  it("leaves a long, finished message as it is apart from the fixes", () => {
    const long = `${"We have checked your order and the refund was issued yesterday. ".repeat(3)}`.trim();
    expect(refineDemoText(long)).toBe(long);
  });
});

describe("demoQuickReplies", () => {
  it("has searchable tags and unique ids", () => {
    const replies = demoQuickReplies();
    expect(new Set(replies.map((reply) => reply.id)).size).toBe(replies.length);
    expect(replies.every((reply) => reply.tags.length > 0 && reply.message)).toBe(true);
  });
});
