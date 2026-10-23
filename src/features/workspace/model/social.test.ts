import { describe, expect, it } from "vitest";
import { attachCommentContext, mayActOnComment, mayEditMessage } from "./social";
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

  it("offers unhide on a hidden Facebook comment even when the connector turns hiding off", () => {
    const conversation = conversationFixture();
    const session = conversation.activeChannelSessions[0]!;
    session.channel.channelType.name = "FACEBOOK";
    session.channel.channelConnector = {
      channelProviderConfigs: [{ key: "HIDE_SUPPORT_SM", type: "Boolean", value: false }],
    };
    const hidden: CimMessage = {
      id: "cim-hidden",
      isHidden: true,
      header: { sender: { type: "CUSTOMER" }, providerMessageId: "provider-hidden" },
      body: { type: "COMMENT", itemType: "TEXT", postId: "post-1", markdownText: "Spam" },
    };
    expect(mayActOnComment(hidden, session, "unhide")).toBe(true);
    expect(mayActOnComment({ ...hidden, isHidden: false }, session, "hide")).toBe(false);
    session.channel.channelType.name = "YOUTUBE";
    expect(mayActOnComment(hidden, session, "unhide")).toBe(false);
  });

  it("lets the agent edit a comment reply only when the connector allows edits", () => {
    const conversation = conversationFixture();
    const session = conversation.activeChannelSessions[0]!;
    session.channel.channelType.name = "FACEBOOK";
    const reply: CimMessage = {
      id: "cim-reply",
      header: { sender: { type: "AGENT", id: "agent-id" }, channelSession: session },
      body: { type: "COMMENT", itemType: "TEXT", postId: "post-1", markdownText: "Thanks!" },
    };
    expect(mayEditMessage(conversation, reply, session)).toBe(true);
    session.channel.channelConnector = {
      channelProviderConfigs: [{ key: "EDIT_MESSAGE_SUPPORT_SM", type: "Boolean", value: "false" }],
    };
    expect(mayEditMessage(conversation, reply, session)).toBe(false);
  });

  it("matches Instagram by name the way the source does when deciding on likes", () => {
    const conversation = conversationFixture();
    const session = conversation.activeChannelSessions[0]!;
    const comment: CimMessage = {
      id: "cim-like",
      header: { sender: { type: "CUSTOMER" }, providerMessageId: "provider-like" },
      body: { type: "COMMENT", itemType: "TEXT", postId: "post-1", markdownText: "Nice" },
    };
    session.channel.channelType.name = "FACEBOOK";
    expect(mayActOnComment(comment, session, "like")).toBe(true);
    session.channel.channelType.name = "INSTAGRAM_COMMENTS";
    expect(mayActOnComment(comment, session, "like")).toBe(false);
    session.channel.channelType.name = "YOUTUBE";
    expect(mayActOnComment(comment, session, "like")).toBe(false);
  });
});
