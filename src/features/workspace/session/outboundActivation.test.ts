import { beforeEach, describe, expect, it, vi } from "vitest";
import { conversationFixture } from "@/test/conversations";
import { useConversationStore } from "../store/conversationStore";
import { waitForOutboundSession } from "./outboundActivation";

const auth = vi.hoisted(() => ({ owner: "agent-id", listeners: new Set<() => void>() }));
vi.mock("@/core/auth", () => ({
  can: () => true,
  getSession: () => ({ user: { id: auth.owner } }),
  useSessionStore: {
    subscribe: (listener: () => void) => {
      auth.listeners.add(listener);
      return () => auth.listeners.delete(listener);
    },
  },
}));
const target = {
  owner: "agent-id",
  channel: "EMAIL" as const,
  destination: "amina@example.com",
  from: "support@example.com",
  customerId: "customer-a",
};
const active = () => {
  const c = conversationFixture("a");
  c.activeChannelSessions[0]!.channel.channelType.name = "EMAIL";
  c.activeChannelSessions[0]!.channel.serviceIdentifier = target.from;
  c.activeChannelSessions[0]!.channelData.channelCustomerIdentifier = target.destination;
  return c;
};
beforeEach(() => {
  vi.useRealTimers();
  auth.owner = "agent-id";
  auth.listeners.clear();
  useConversationStore.setState({ byId: {} });
});
describe("outbound session activation", () => {
  it("waits for the exact destination, From, customer and primary owner", async () => {
    const pending = waitForOutboundSession(target),
      result = vi.fn();
    void pending.then(result);
    const wrong = active();
    wrong.activeChannelSessions[0]!.channel.serviceIdentifier = "another@example.com";
    useConversationStore.setState({ byId: { a: wrong } });
    await Promise.resolve();
    expect(result).not.toHaveBeenCalled();
    const right = active();
    useConversationStore.setState({ byId: { a: right } });
    expect(await pending).toMatchObject({ conversation: { conversationId: "a" }, session: { id: "a-web" } });
    expect(auth.listeners.size).toBe(0);
  });
  it("cancels immediately on identity change and removes the listener", async () => {
    const pending = waitForOutboundSession(target),
      assertion = expect(pending).rejects.toThrow("session changed");
    auth.owner = "another-agent";
    for (const listener of [...auth.listeners]) listener();
    await assertion;
    expect(auth.listeners.size).toBe(0);
  });
  it("times out and supports abort without dispatching an unrelated session", async () => {
    vi.useFakeTimers();
    const timeout = waitForOutboundSession({ ...target, timeoutMs: 50 }),
      timedOut = expect(timeout).rejects.toThrow("did not become active");
    await vi.advanceTimersByTimeAsync(50);
    await timedOut;
    expect(auth.listeners.size).toBe(0);
    const controller = new AbortController(),
      aborted = waitForOutboundSession({ ...target, signal: controller.signal });
    const assertion = expect(aborted).rejects.toThrow("cancelled");
    controller.abort();
    await assertion;
    expect(auth.listeners.size).toBe(0);
    vi.useRealTimers();
  });
});
