import { beforeEach, describe, expect, it, vi } from "vitest";
import { conversationFixture } from "@/test/conversations";
import { useConversationStore } from "../store/conversationStore";
import { sendEmail, sendFiles, sendText } from "./actions";

const mocks = vi.hoisted(() => ({ publish: vi.fn(), upload: vi.fn() }));
vi.mock("@/core/auth", () => ({ can: () => true, getSession: () => ({ user: { id: "agent-id" } }) }));
vi.mock("@/core/realtime", () => ({ socketManager: { connected: true } }));
vi.mock("../api", () => ({ uploadFile: mocks.upload }));
vi.mock("@/config", () => ({ getFileDownloadBaseUrl: () => "https://files.example.com" }));
vi.mock("./agentSession", () => ({ emitHandRaise: vi.fn() }));
vi.mock("./commands", () => ({ publishCimEvent: mocks.publish, unsubscribeTopic: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  useConversationStore.setState({ byId: {}, order: [], activeId: null });
});
describe("message dispatch audience and session", () => {
  it("does not publish a draft left over from another agent identity", () => {
    const c = conversationFixture();
    c.topicParticipant.participant.keycloakUser.id = "previous-agent";
    useConversationStore.setState({ byId: { [c.conversationId]: c } });
    expect(sendText(c.conversationId, "Previous customer's draft")).toBe(false);
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it("keeps a whisper edit private and rejects another agent or a different channel session", () => {
    const c = conversationFixture();
    const session = c.activeChannelSessions[0]!;
    c.messages = [
      {
        id: "private",
        header: { sender: { type: "AGENT", id: "agent-id" }, channelSession: session },
        body: { type: "PLAIN", isWhisper: true },
      },
    ];
    useConversationStore.setState({ byId: { [c.conversationId]: c } });
    expect(
      sendText(c.conversationId, "Edited private note", {
        intent: "UPDATE",
        originalMessageId: "private",
        whisper: false,
      }),
    ).toBe(true);
    expect(mocks.publish.mock.calls[0]![1]).toMatchObject({
      name: "WHISPER_MESSAGE",
      channelSession: { id: session.id },
      data: { header: { intent: "UPDATE", originalMessageId: "private" } },
    });
    c.messages[0]!.header.sender!.id = "another-agent";
    expect(
      sendText(c.conversationId, "Not my note", { intent: "UPDATE", originalMessageId: "private" }),
    ).toBe(false);
    c.messages[0]!.header.sender!.id = "agent-id";
    c.messages[0]!.header.channelSession = { ...session, id: "another-session" };
    expect(
      sendText(c.conversationId, "Wrong channel", { intent: "UPDATE", originalMessageId: "private" }),
    ).toBe(false);
    expect(mocks.publish).toHaveBeenCalledTimes(1);
  });
  it("rechecks comment availability after an upload before publishing", async () => {
    const c = conversationFixture(),
      session = c.activeChannelSessions[0]!;
    session.channel.channelType.name = "FACEBOOK";
    c.messages = [
      {
        id: "comment",
        header: {
          sender: { type: "CUSTOMER" },
          providerMessageId: "provider-comment",
          channelSession: session,
        },
        body: { type: "COMMENT", postId: "post" },
      },
    ];
    useConversationStore.setState({ byId: { [c.conversationId]: c } });
    let complete!: (value: { name: string; type: string; size: number }) => void;
    mocks.upload.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const pending = sendFiles(c.conversationId, [new File(["image"], "answer.png", { type: "image/png" })], {
      originalMessageId: "comment",
      intent: "REPLY_TO",
    });
    useConversationStore.setState({
      byId: { [c.conversationId]: { ...c, messages: c.messages.map((m) => ({ ...m, isDeleted: true })) } },
    });
    complete({ name: "uploaded.png", type: "image/png", size: 5 });
    expect(await pending).toEqual([]);
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it("preserves the COMMENT envelope and post when editing an agent comment", () => {
    const c = conversationFixture(),
      session = c.activeChannelSessions[0]!;
    session.channel.channelType.name = "FACEBOOK";
    c.messages = [
      {
        id: "own-comment",
        header: { sender: { type: "AGENT", id: "agent-id" }, channelSession: session },
        body: { type: "COMMENT", itemType: "TEXT", postId: "post" },
      },
    ];
    useConversationStore.setState({ byId: { [c.conversationId]: c } });
    expect(
      sendText(c.conversationId, "Corrected answer", { intent: "UPDATE", originalMessageId: "own-comment" }),
    ).toBe(true);
    expect(mocks.publish.mock.calls[0]![1]).toMatchObject({
      name: "AGENT_MESSAGE",
      data: {
        header: { intent: "UPDATE", originalMessageId: "own-comment", providerMessageId: null },
        body: { type: "COMMENT", itemType: "TEXT", postId: "post" },
      },
    });
  });
});

describe("rich email dispatch", () => {
  it("uploads inline images once, replaces blob references with CID metadata, and sends one pinned email", async () => {
    const c = conversationFixture("email");
    const session = c.activeChannelSessions[0]!;
    session.channel.channelType.name = "EMAIL";
    useConversationStore.setState({ byId: { email: c } });
    mocks.upload.mockResolvedValue({ name: "inline.png", type: "image/png", size: 5 });
    const image = {
      id: "image-1",
      file: new File(["image"], "inline.png", { type: "image/png" }),
      url: "blob:local",
    };
    expect(
      await sendEmail(
        "email",
        "Answer",
        {
          subject: "Account",
          to: "amina@example.com",
          htmlBody:
            '<b>Answer</b><img src="blob:local" data-inline-id="image-1"><img src="blob:local" data-inline-id="image-1">',
          inlineImages: [image],
        },
        [],
      ),
    ).toBe(true);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.publish).toHaveBeenCalledTimes(1);
    const event = mocks.publish.mock.calls[0]![1];
    expect(event.data.body.htmlBody).toContain("<b>Answer</b>");
    expect(event.data.body.htmlBody).toContain('data-cid="inline.png"');
    expect(event.data.body.htmlBody).not.toMatch(/blob:|data-inline-id/);
    expect(event.data.body.inlineImages).toBeUndefined();
    // Source: the plain-text part is the whole email, and an email carries no reply intent.
    expect(event.data.body.markdownText).toBe("Answer");
    expect(event.data.header.intent).toBeNull();
    expect(event.data.header.originalMessageId).toBeUndefined();
    expect(event.channelSession.id).toBe(session.id);
  });
  it("does not publish on upload failure or cancellation while an inline image uploads", async () => {
    const c = conversationFixture("email");
    c.activeChannelSessions[0]!.channel.channelType.name = "EMAIL";
    useConversationStore.setState({ byId: { email: c } });
    const image = {
      id: "image-1",
      file: new File(["image"], "inline.png", { type: "image/png" }),
      url: "blob:local",
    };
    const email = {
      subject: "Account",
      to: "amina@example.com",
      htmlBody: '<img src="blob:local" data-inline-id="image-1">',
      inlineImages: [image],
    };
    mocks.upload.mockRejectedValueOnce(new Error("Upload unavailable"));
    expect(await sendEmail("email", "", email, [])).toBe(false);
    const controller = new AbortController();
    mocks.upload.mockImplementationOnce(async () => {
      controller.abort();
      return { name: "inline.png", type: "image/png", size: 5 };
    });
    expect(await sendEmail("email", "", email, [], { signal: controller.signal })).toBe(false);
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(email.htmlBody).toContain("blob:local");
  });
});
