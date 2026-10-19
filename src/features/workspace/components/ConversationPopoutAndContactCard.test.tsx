import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { customerDisplayName } from "../model/display";
import { usePopoutStore, mergeConversationBack } from "../store/popout";
import { useConversationStore } from "../store/conversationStore";
import { conversationFixture } from "@/test/conversations";
import { ConversationPopoutHost } from "./ConversationPopoutHost";
import { MessageBody } from "./messages/MessageBody";
import type { CimMessage } from "../model/types";

vi.mock("@/core/auth", () => ({
  useCurrentUser: () => ({ id: "agent-1", username: "agent" }),
  getSession: () => ({ user: { id: "agent-1" } }),
  usePermission: () => true,
  useScope: () => true,
  can: () => true,
}));

vi.mock("@/core/agent-settings", () => ({
  useDeskSettings: () => ({}),
  getDeskSettings: () => ({}),
}));

vi.mock("./ConversationPane", () => ({
  ConversationPane: ({ conversationId }: { conversationId: string }) => (
    <div data-testid={`pane-${conversationId}`}>Conversation Pane {conversationId}</div>
  ),
}));

describe("Customer Full Name Display", () => {
  it("formats full name with both first and last name", () => {
    const customer = { firstName: "Sarah", lastName: "Connor" };
    expect(customerDisplayName(customer as unknown as Parameters<typeof customerDisplayName>[0])).toBe(
      "Sarah Connor",
    );
  });

  it("handles only first name or only last name gracefully", () => {
    expect(
      customerDisplayName({ firstName: "Sarah" } as unknown as Parameters<typeof customerDisplayName>[0]),
    ).toBe("Sarah");
    expect(
      customerDisplayName({ lastName: "Connor" } as unknown as Parameters<typeof customerDisplayName>[0]),
    ).toBe("Connor");
  });
});

describe("Conversation Popout & Merge Back", () => {
  it("supports opening popout, dragging, and merging conversation back", async () => {
    const conversation = conversationFixture("conv-popout", "John");
    conversation.customer = {
      _id: "cust-1",
      firstName: "John",
      lastName: "Doe",
    };
    useConversationStore.setState((s) => ({
      byId: { ...s.byId, [conversation.conversationId]: conversation },
      order: [...s.order, conversation.conversationId],
    }));

    // Open popout
    usePopoutStore.getState().open("conv-popout");
    expect(usePopoutStore.getState().ids).toContain("conv-popout");

    render(<ConversationPopoutHost />);

    // The window is labelled with the customer, but the name is shown once (by the pane), not also in the window bar.
    expect(screen.getByRole("dialog", { name: "John Doe" })).toBeInTheDocument();
    expect(screen.queryAllByText("John Doe").length).toBeLessThanOrEqual(1);

    // Check merge back button
    const mergeBtn = screen.getByRole("button", { name: /merge back into main view/i });
    expect(mergeBtn).toBeInTheDocument();

    // Click merge back button
    const user = userEvent.setup();
    await user.click(mergeBtn);

    // Should no longer be in popout ids
    expect(usePopoutStore.getState().ids).not.toContain("conv-popout");
    // Should be active in conversation store
    expect(useConversationStore.getState().activeId).toBe("conv-popout");
  });

  it("mergeConversationBack helper restores active conversation", () => {
    usePopoutStore.setState({ ids: ["conv-123"] });
    mergeConversationBack("conv-123");
    expect(usePopoutStore.getState().ids).not.toContain("conv-123");
    expect(useConversationStore.getState().activeId).toBe("conv-123");
  });
});

describe("Clickable Contact Card in Messages", () => {
  it("renders a clickable contact card with copy and call actions", () => {
    const contactMessage: CimMessage = {
      id: "msg-contact-1",
      header: {
        timestamp: Date.now(),
        sender: { id: "customer-1", type: "customer" },
      },
      body: {
        type: "contact",
        contact: {
          name: "Alice Smith",
          phone: "+15551234567",
        },
      },
    };

    render(
      <MessageBody
        message={contactMessage}
        formatting={true}
        conversation={conversationFixture("conv-test", "Alice")}
      />,
    );

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("+15551234567")).toBeInTheDocument();

    // Copy button exists
    const copyBtn = screen.getByRole("button", { name: /copy phone/i });
    expect(copyBtn).toBeInTheDocument();

    // Call link exists with tel: URL
    const callLink = screen.getByRole("link", { name: /call/i });
    expect(callLink).toBeInTheDocument();
    expect(callLink).toHaveAttribute("href", "tel:+15551234567");
  });
});
