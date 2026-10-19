import { beforeEach, describe, expect, it, vi } from "vitest";
import { conversationFixture } from "@/test/conversations";
import { useConversationStore } from "../store/conversationStore";
import { sendColdOutbound } from "./coldOutbound";
const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  email: vi.fn(),
  text: vi.fn(),
  signature: vi.fn(),
  upload: vi.fn(),
  publish: vi.fn(),
  connected: true,
  owner: "agent-id",
  listeners: new Set<() => void>(),
}));
vi.mock("@/core/api", () => ({ ccmApi: { post: mocks.post } }));
vi.mock("@/core/auth", () => ({
  can: () => true,
  getSession: () => ({ user: { id: mocks.owner, username: "agent" } }),
  useSessionStore: {
    subscribe: (listener: () => void) => {
      mocks.listeners.add(listener);
      return () => mocks.listeners.delete(listener);
    },
  },
}));
vi.mock("@/core/realtime", () => ({
  socketManager: {
    get connected() {
      return mocks.connected;
    },
  },
}));
vi.mock("../api/outbound", () => ({
  getOutboundFromChannels: () =>
    Promise.resolve({ channels: [{ serviceIdentifier: "support@example.com" }] }),
  shouldBlockOutbound: () => Promise.resolve({ blocked: false }),
}));
vi.mock("../api/extras", () => ({ loadEmailSignature: mocks.signature }));
vi.mock("./actions", () => ({ sendEmail: mocks.email, sendText: mocks.text, mayCompose: () => true }));
vi.mock("../api", () => ({ uploadFile: mocks.upload }));
vi.mock("@/config", () => ({ getFileDownloadBaseUrl: () => "https://files.example.com" }));
vi.mock("./commands", () => ({ publishCimEvent: mocks.publish }));
vi.mock("@/core/agent-settings", () => ({ getDeskSettings: () => ({ callingCompliance: false }) }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.owner = "agent-id";
  mocks.connected = true;
  mocks.listeners.clear();
  mocks.post.mockResolvedValue({});
  mocks.email.mockResolvedValue(true);
  mocks.signature.mockResolvedValue({ signatureBodyWithAgentName: "<p>Sana</p>" });
  useConversationStore.setState({ byId: {} });
});
const input = {
  channel: "EMAIL" as const,
  destination: "amina@example.com",
  from: "support@example.com",
  text: "Hello",
  customer: { _id: "customer-a" },
  email: { to: "amina@example.com", subject: "Account", htmlBody: "<b>Hello</b>" },
};
describe("cold outbound email", () => {
  it("starts with a minimal envelope and sends once on the confirmed email session", async () => {
    const pending = sendColdOutbound(input);
    await vi.waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(mocks.post).toHaveBeenCalledWith(
      "/message/receive",
      expect.objectContaining({
        header: expect.objectContaining({ intent: "AGENT_OUTBOUND" }),
        body: { type: "PLAIN", markdownText: "" },
      }),
    );
    expect(mocks.email).not.toHaveBeenCalled();
    const c = conversationFixture("a"),
      web = c.activeChannelSessions[0]!;
    c.activeChannelSessions.push({
      ...structuredClone(web),
      id: "a-email",
      isChecked: false,
      channel: { channelType: { name: "EMAIL" }, serviceIdentifier: input.from },
      channelData: { serviceIdentifier: input.from, channelCustomerIdentifier: input.destination },
    });
    useConversationStore.setState({ byId: { a: c } });
    expect(await pending).toBe("a");
    expect(mocks.email).toHaveBeenCalledTimes(1);
    expect(mocks.email).toHaveBeenCalledWith(
      "a",
      "Hello",
      expect.objectContaining({
        from: input.from,
        replyTo: [input.from],
        htmlBody: "<b>Hello</b><br/><p>Sana</p>",
      }),
      [],
      expect.objectContaining({ sessionId: "a-email" }),
    );
    expect(c.activeChannelSessions[0]?.isChecked).toBe(true);
  });
  it("rejects disconnected sends before creating a conversation", async () => {
    mocks.connected = false;
    await expect(sendColdOutbound(input)).rejects.toThrow("Connect your agent");
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
  });
});

it("rejects invalid Cc recipients before creating an outbound conversation", async () => {
  await expect(sendColdOutbound({ ...input, email: { ...input.email, cc: "invalid" } })).rejects.toThrow(
    "valid destination",
  );
  expect(mocks.post).not.toHaveBeenCalled();
});
it("uploads a cold WhatsApp attachment once and publishes its caption on the matching session", async () => {
  mocks.upload.mockResolvedValue({ name: "account.pdf", type: "application/pdf", size: 5 });
  const wa = {
    channel: "WHATSAPP" as const,
    destination: "+15551234567",
    from: input.from,
    text: "Review account",
    customer: input.customer,
    files: [new File(["file"], "account.pdf", { type: "application/pdf" })],
  };
  const pending = sendColdOutbound(wa);
  await vi.waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
  expect(mocks.post.mock.calls[0]![1].body).toMatchObject({
    type: "FILE",
    caption: "account.pdf",
    markdownText: "Review account",
    attachment: { mimeType: "application/pdf" },
  });
  const c = conversationFixture("a"),
    session = c.activeChannelSessions[0]!;
  session.channel = { channelType: { name: "WHATSAPP" }, serviceIdentifier: wa.from };
  session.channelData = { serviceIdentifier: wa.from, channelCustomerIdentifier: wa.destination };
  useConversationStore.setState({ byId: { a: c } });
  expect(await pending).toBe("a");
  expect(mocks.upload).toHaveBeenCalledTimes(1);
  expect(mocks.text).not.toHaveBeenCalled();
  expect(mocks.publish.mock.calls[0]![1]).toMatchObject({
    channelSession: { id: session.id },
    data: { body: { type: "FILE", caption: "account.pdf", markdownText: "Review account" } },
  });
});
