import { expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OutboundComposeSheet } from "./OutboundComposeSheet";

const mocks = vi.hoisted(() => ({ compliance: vi.fn(), sms: vi.fn(), cold: vi.fn() }));
vi.mock("@/core/auth", () => ({
  useCurrentUser: () => ({ id: "agent" }),
  getSession: () => ({ user: { id: "agent" } }),
  usePermission: () => true,
}));
vi.mock("@/features/workspace", () => ({
  getOutboundFromChannels: async () => ({
    channels: [{ serviceIdentifier: "support" }],
    selected: "support",
  }),
  channelDisplayLabel: () => "Support",
  shouldBlockOutbound: mocks.compliance,
  startOutboundSms: mocks.sms,
  sendColdOutbound: mocks.cold,
  escapeEmailText: (text: string) => text,
  sanitizeEmailHtml: (text: string) => text,
  revokeInlineImages: vi.fn(),
  EmailEditor: () => null,
  useSpelling: () => ({ suggestions: null, overlay: null, active: false, textareaProps: {} }),
}));

it("cancels a pending compliance check when the compose sheet unmounts before initiation", async () => {
  let resolve!: (value: { blocked: boolean }) => void;
  mocks.compliance.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const query = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  const view = render(
    <QueryClientProvider client={query}>
      <OutboundComposeSheet
        request={{ channel: "SMS", destination: "+15551234567", customer: { _id: "customer" } }}
        onClose={onClose}
      />
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: /message/i }), "Review your account");
  const send = screen.getByRole("button", { name: /send/i });
  await waitFor(() => expect(send).toBeEnabled());
  await user.click(send);
  expect(mocks.compliance).toHaveBeenCalledTimes(1);
  view.unmount();
  resolve({ blocked: false });
  await waitFor(() => expect(query.isFetching()).toBe(0));
  expect(mocks.sms).not.toHaveBeenCalled();
  expect(mocks.cold).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  query.clear();
});
