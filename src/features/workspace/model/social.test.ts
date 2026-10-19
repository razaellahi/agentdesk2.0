import { describe, expect, it } from "vitest";
import { attachCommentContext, mayActOnComment } from "./social";
import { conversationFixture } from "@/test/conversations";
import { buildTextMessage } from "./outgoing";
import type { CimMessage } from "./types";
describe("social comment contracts", () => {
  it("preserves provider and post IDs for private replies without mutating the original", () => {
    const conversation = conversationFixture();
    const session = conversation.activeChannelSessions[0]!;
    session.channel.channelType.name = "FACEBOOK";
    const original: CimMessage = {
      id: "cim-comment",
      header: { sender: { type: "CUSTOMER" }, providerMessageId: "provider-comment" },
      body: { type: "COMMENT", itemType: "TEXT", postId: "post-1", markdownText: "Question" },
    };
    const snapshot = structuredClone(original);
    const reply = attachCommentContext(
      buildTextMessage(conversation, session, "Private answer"),
      original,
      true,
    );
    expect(reply).toMatchObject({
      header: { providerMessageId: "provider-comment", originalMessageId: "cim-comment", intent: "REPLY_TO" },
      body: { type: "COMMENT", itemType: "PRIVATE_REPLY", postId: "post-1" },
    });
    expect(original).toEqual(snapshot);
    expect(mayActOnComment(original, session, "private")).toBe(true);
    session.channel.channelConnector = {
      channelProviderConfigs: [{ key: "PRIVATE_REPLY_SUPPORT_SM", type: "Boolean", value: "false" }],
    };
    expect(mayActOnComment(original, session, "private")).toBe(false);
    expect(mayActOnComment({ ...original, isDeleted: true }, session, "reply")).toBe(false);
    session.channel.channelType.name = "YOUTUBE";
    expect(mayActOnComment(original, session, "hide")).toBe(false);
  });
});
