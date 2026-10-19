import { beforeEach, describe, expect, it, vi } from "vitest";
import { conversationFixture } from "@/test/conversations";
import { useConversationStore } from "../store/conversationStore";
import { publishSeen, resetSeenMessages } from "./seen";
const mock = vi.hoisted(() => ({ owner: "agent-id", connected: true, publish: vi.fn() }));
vi.mock("@/core/auth", () => ({ can: () => true, getSession: () => ({ user: { id: mock.owner } }) }));
vi.mock("@/core/realtime", () => ({
  socketManager: {
    get connected() {
      return mock.connected;
    },
  },
}));
vi.mock("./commands", () => ({ publishCimEvent: mock.publish }));
beforeEach(() => {
  mock.owner = "agent-id";
  mock.connected = true;
  vi.clearAllMocks();
  resetSeenMessages();
});
describe("read receipt dispatch", () => {
  it("deduplicates main/pop-out receipts and only clears unread after an eligible publish", () => {
    const c = conversationFixture();
    c.unread = 3;
    useConversationStore.setState({ byId: { [c.conversationId]: c } });
    const message = c.messages[0]!,
      context = { focused: true, visible: true, atBottom: true };
    publishSeen(c, message, { ...context, focused: false });
    expect(useConversationStore.getState().byId[c.conversationId]?.unread).toBe(3);
    publishSeen(c, message, context);
    publishSeen(c, message, context);
    expect(mock.publish).toHaveBeenCalledTimes(1);
    expect(mock.publish.mock.calls[0]![1]).toMatchObject({
      name: "MESSAGE_DELIVERY_NOTIFICATION",
      type: "NOTIFICATION",
      data: {
        body: { type: "DELIVERYNOTIFICATION", messageId: message.id, status: "READ", reasonCode: 200 },
      },
    });
    expect(useConversationStore.getState().byId[c.conversationId]?.unread).toBe(0);
  });
  it("rejects disconnected and previous-identity callbacks", () => {
    const c = conversationFixture(),
      context = { focused: true, visible: true, atBottom: true };
    mock.connected = false;
    publishSeen(c, c.messages[0]!, context);
    mock.connected = true;
    mock.owner = "other-agent";
    publishSeen(c, c.messages[0]!, context);
    expect(mock.publish).not.toHaveBeenCalled();
  });
});
