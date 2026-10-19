import { describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { conversationFixture } from "@/test/conversations";
import { useContextTabs } from "../hooks/useCustomerContext";
import { CustomerPanel } from "./CustomerPanel";

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
}));

vi.mock("@/core/agent-settings", () => ({
  useDeskSettings: () => ({
    outboundSms: true,
    cxVoice: true,
    smsPrefixCode: "+1",
    callingCompliance: true,
  }),
  getDeskSettings: () => ({
    outboundSms: true,
    cxVoice: true,
    smsPrefixCode: "+1",
    callingCompliance: true,
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
  hasOptOutLabel: () => false,
}));

vi.mock("../store/schemaStore", () => ({
  useSchemaStore: (selector: (state: { schema: unknown[] }) => unknown) => selector({ schema: [] }),
}));

describe("Outbound capability when conversation is opened", () => {
  it("includes outbound tab in useContextTabs for the open conversation", () => {
    const conversation = conversationFixture();
    const { result } = renderHook(() => useContextTabs(conversation));
    const outboundTab = result.current.find((t) => t.id === "outbound");
    expect(outboundTab).toBeDefined();
    expect(outboundTab?.label).toBeTruthy();
  });

  it("renders OutboundTab with customer phone and enables voice and SMS outbound", async () => {
    const conversation = conversationFixture("conv-1", "Sarah");
    conversation.customer = {
      _id: "cust-1",
      firstName: "Sarah",
      phoneNumber: "+15559876543",
    };

    const query = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={query}>
          <CustomerPanel conversation={conversation} tab="outbound" />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    // Every channel is a row with its own button; nothing is open until one is chosen.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByTestId("outbound-sms-submit")).not.toBeInTheDocument();
    expect(await screen.findByText("workspace.reach.channel.sms")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "workspace.reach.action.voice" }));
    await waitFor(() =>
      expect(mocks.placeVoice).toHaveBeenCalledWith(
        "+15559876543",
        expect.objectContaining({ customer: expect.anything() }),
      ),
    );
    expect(screen.getByRole("button", { name: "workspace.reach.action.sms" })).toBeEnabled();
    query.clear();
  });
});
