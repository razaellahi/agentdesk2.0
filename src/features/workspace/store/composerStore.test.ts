import { beforeEach, describe, expect, it } from "vitest";
import { conversationFixture } from "@/test/conversations";
import { composerKey, useComposerStore } from "./composerStore";
describe("conversation drafts", () => {
  beforeEach(() => useComposerStore.getState().reset());
  it("isolates text, recipients, edit and reply state by conversation and channel", () => {
    const first = conversationFixture("a");
    const second = conversationFixture("b");
    const a = composerKey(first),
      b = composerKey(second);
    useComposerStore.getState().patch(a, { text: "Draft A", to: "a@example.com" });
    useComposerStore.getState().setReplyTo(a, "message-a");
    useComposerStore.getState().setEdit(b, "message-b", "Edit B");
    first.activeChannelSessions[0]!.id = "email";
    const email = composerKey(first);
    expect(email).not.toBe(a);
    expect(useComposerStore.getState().drafts[email]).toBeUndefined();
    expect(useComposerStore.getState().drafts[a]).toMatchObject({
      text: "Draft A",
      to: "a@example.com",
      replyToId: "message-a",
      editMessageId: null,
    });
    expect(useComposerStore.getState().drafts[b]).toMatchObject({
      text: "Edit B",
      to: "",
      replyToId: null,
      editMessageId: "message-b",
    });
  });
  it("keeps drafts in memory and clears them across identity sessions", () => {
    const key = composerKey(conversationFixture());
    useComposerStore.getState().insertText(key, "Customer data");
    useComposerStore.getState().insertText(key, "KB answer");
    expect(useComposerStore.getState().drafts[key]?.text).toBe("Customer data\nKB answer");
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    useComposerStore.getState().reset();
    expect(useComposerStore.getState().drafts).toEqual({});
  });
});
