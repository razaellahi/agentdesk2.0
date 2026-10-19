import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { setConfig } from "@/config";
import { makeConfig } from "@/test/fixtures";
import { initI18n } from "@/core/i18n";
import { conversationFixture } from "@/test/conversations";
import { useConversationStore } from "../store/conversationStore";
import { ConversationPane } from "./ConversationPane";

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}

const mocks = vi.hoisted(() => ({
  compliance: vi.fn().mockResolvedValue({ blocked: false }),
  placeVoice: vi.fn().mockResolvedValue(undefined),
  startSms: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/core/auth", () => ({
  useCurrentUser: () => ({ id: "agent-1", username: "agent" }),
  getSession: () => ({ user: { id: "agent-1" } }),
  usePermission: () => true,
  useScope: () => true,
  can: () => true,
}));

vi.mock("@/core/agent-settings", () => ({
  useDeskSettings: () => ({
    outboundSms: true,
    cxVoice: true,
    smsPrefixCode: "+1",
    callingCompliance: true,
    holdOptions: [{ label: "5m", value: 5 }],
  }),
  getDeskSettings: () => ({
    outboundSms: true,
    cxVoice: true,
    smsPrefixCode: "+1",
    callingCompliance: true,
    holdOptions: [{ label: "5m", value: 5 }],
  }),
}));

vi.mock("@/features/voice", () => ({
  useCallStore: (selector: (state: unknown) => unknown) => selector({ registered: true, phase: "idle" }),
  placeOutboundVoice: mocks.placeVoice,
}));

vi.mock("../api/outbound", () => ({
  getOutboundFromChannels: async (channel: string) => ({
    channels: [{ serviceIdentifier: `support-${channel.toLowerCase()}`, channelType: { name: channel } }],
    selected: `support-${channel.toLowerCase()}`,
  }),
  channelDisplayLabel: (ch: { serviceIdentifier: string }) => ch.serviceIdentifier,
  shouldBlockOutbound: mocks.compliance,
  startOutboundSms: mocks.startSms,
  startIdentifierConversation: vi.fn(),
  OutboundStartError: class extends Error {},
  hasOptOutLabel: (customer: { labels?: unknown[] } | null) =>
    (customer?.labels ?? []).some((label) => label === "opt-out"),
}));

vi.mock("../store/schemaStore", () => ({
  useSchemaStore: (selector: (state: { schema: unknown[]; channelTypes: unknown[] }) => unknown) =>
    selector({ schema: [], channelTypes: [] }),
}));

describe("ConversationPane Reach customer", () => {
  beforeEach(async () => {
    setConfig(makeConfig());
    await initI18n({ defaultLanguage: "en", preferred: "en" });
    vi.clearAllMocks();
  });

  const open = async (
    customer: Record<string, unknown>,
    setup?: (c: ReturnType<typeof conversationFixture>) => void,
  ) => {
    const conversation = conversationFixture(`conv-${String(customer._id)}`, String(customer.firstName));
    conversation.customer = customer as typeof conversation.customer;
    setup?.(conversation);
    useConversationStore.setState((s) => ({
      byId: { ...s.byId, [conversation.conversationId]: conversation },
      order: [conversation.conversationId],
      activeId: conversation.conversationId,
    }));
    const query = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <QueryClientProvider client={query}>
          <ConversationPane conversationId={conversation.conversationId} />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    await user.click(screen.getByTestId("conversation-outbound-trigger"));
    return { user, conversation };
  };

  it("lists every usable channel with its destination", async () => {
    await open({ _id: "wayne", firstName: "Bruce", phoneNumber: "+15550001111", email: "bruce@wayne.com" });
    expect(await screen.findByText("workspace.reach.title")).toBeInTheDocument();
    expect(screen.getByText("workspace.reach.channel.voice")).toBeInTheDocument();
    expect(screen.getByText("workspace.reach.channel.sms")).toBeInTheDocument();
    expect(screen.getByText("workspace.reach.channel.whatsapp")).toBeInTheDocument();
    expect(screen.getByText("workspace.reach.channel.email")).toBeInTheDocument();
    expect(screen.getByText("bruce@wayne.com")).toBeInTheDocument();
    // No X handle on the profile: the row is left out rather than shown disabled.
    expect(screen.queryByText("workspace.reach.channel.twitter")).not.toBeInTheDocument();
  });

  it("calls the customer's number", async () => {
    const { user } = await open({ _id: "kent", firstName: "Clark", phoneNumber: "+15550002222" });
    await user.click(await screen.findByRole("button", { name: "workspace.reach.action.voice" }));
    await waitFor(() =>
      expect(mocks.placeVoice).toHaveBeenCalledWith(
        "+15550002222",
        expect.objectContaining({ customer: expect.anything() }),
      ),
    );
  });

  it("opens the SMS composer with the destination filled in", async () => {
    const { user } = await open({ _id: "diana", firstName: "Diana", phoneNumber: "+15550003333" });
    await user.click(await screen.findByRole("button", { name: "workspace.reach.action.sms" }));
    await waitFor(() => expect(screen.getByDisplayValue("+15550003333")).toBeInTheDocument());
  });

  it("continues on a channel the customer is already on instead of starting another", async () => {
    const { user, conversation } = await open(
      { _id: "selina", firstName: "Selina", phoneNumber: "+15550004444" },
      (c) => {
        c.activeChannelSessions.push({
          ...structuredClone(c.activeChannelSessions[0]!),
          id: "selina-wa",
          channel: { channelType: { name: "WHATSAPP" } },
          channelData: { channelCustomerIdentifier: "+15550004444", serviceIdentifier: "wa" },
          isChecked: false,
        });
      },
    );
    expect(await screen.findByText("workspace.reach.continue-heading")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "workspace.reach.reply-here" }));
    const sessions = useConversationStore.getState().byId[conversation.conversationId]!.activeChannelSessions;
    expect(sessions.find((s) => s.id === "selina-wa")?.isChecked).toBe(true);
    expect(mocks.placeVoice).not.toHaveBeenCalled();
  });

  it("offers nothing for an opted-out customer and says why", async () => {
    await open({ _id: "oswald", firstName: "Oswald", phoneNumber: "+15550005555", labels: ["opt-out"] });
    expect(await screen.findByRole("alert")).toHaveTextContent("snackbar.Outbound-Blocked-Opt-Out");
    for (const kind of ["voice", "sms", "whatsapp", "email"])
      expect(
        screen.queryByRole("button", { name: `workspace.reach.action.${kind}` }),
      ).not.toBeInTheDocument();
  });
});
