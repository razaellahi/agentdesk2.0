import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import CustomersPage from "./CustomersPage";
import { searchCustomers } from "./phonebook/customersQuery";

vi.mock("@/core/auth", () => ({
  useCurrentUser: () => ({ id: "agent-1", username: "agent" }),
  usePermission: () => true,
}));

vi.mock("@/core/agent-settings", () => ({
  useDeskSettings: () => ({
    outboundSms: true,
    outboundEmail: true,
    cxVoice: true,
  }),
}));

vi.mock("@/features/voice", () => ({
  placeOutboundVoice: vi.fn(),
  useCallStore: () => ({ registered: true }),
}));

vi.mock("@/features/workspace", () => ({
  WORKSPACE_PATH: "/workspace",
  maskPii: (v: string) => v,
  ChannelCluster: () => null,
  OutboundActionIcon: () => null,
  openLinkConversationDialog: vi.fn(),
  linkCustomerWithTopic: vi.fn(),
  startConversationFromCustomer: vi.fn(),
  useConversationStore: { getState: () => ({ setActive: vi.fn() }) },
  getConversation: vi.fn(),
  useSchemaStore: Object.assign(() => ({ customerSchema: [] }), {
    getState: () => ({ setSchema: vi.fn() }),
  }),
  isFakeConversation: () => false,
  getOutboundFromChannels: vi.fn().mockResolvedValue({ channels: [], selected: "sms" }),
  shouldBlockOutbound: vi.fn().mockResolvedValue({ blocked: false }),
}));

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getCustomer: vi.fn().mockResolvedValue({ _id: "cust-1", firstName: "Alice" }),
  listLabels: vi.fn().mockResolvedValue([]),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
}));

vi.mock("./phonebook/customersQuery", () => ({
  formatCellValue: (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? "—")),
  searchCustomers: vi.fn().mockResolvedValue({
    docs: [
      {
        _id: "cust-1",
        firstName: "Alice",
        lastName: "Smith",
        phoneNumber: ["+15551234567"],
        email: ["alice@example.com"],
        voice: ["+15551234567"],
      },
    ],
    totalDocs: 1,
  }),
  listPhonebookCustomers: vi.fn().mockResolvedValue({ docs: [], totalDocs: 0 }),
  getCustomersByFilterQuery: vi.fn().mockResolvedValue({ docs: [], totalDocs: 0 }),
}));

vi.mock("./phonebook/preferencesApi", () => ({
  getUserPreference: vi.fn().mockResolvedValue(null),
  resolveColumns: () => [
    { field: "firstName", header: "First Name", type: "string" },
    { field: "lastName", header: "Last Name", type: "string" },
    { field: "phoneNumber", header: "Phone", type: "string" },
  ],
}));

vi.mock("@/core/api", () => ({
  cimCustomerApi: {
    get: vi.fn().mockResolvedValue([
      { key: "firstName", label: "First Name", type: "string" },
      { key: "email", label: "Email", type: "email" },
    ]),
  },
}));

describe("CustomersPage action button isolation", () => {
  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/customers"]}>
          <CustomersPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("does not open CustomerForm when clicking action buttons, but opens it on pencil or name click", async () => {
    const user = userEvent.setup();
    renderPage();

    // Wait for customer data to render
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Verify Edit sheet is not open initially
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Clicking the Outbound Call trigger should open dropdown, not the CustomerForm dialog
    const callButton = screen.queryByRole("button", { name: /call/i });
    if (callButton) {
      await user.click(callButton);
      // CustomerForm sheet should NOT be opened
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      // Dropdown menu should be open
      expect(screen.getByRole("menu")).toBeInTheDocument();
      // Clicking the phone number dropdown item should not trigger the edit dialog
      const phoneItem = screen.getByRole("menuitem", { name: "+15551234567" });
      await user.click(phoneItem);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }

    // Clicking start conversation button should not open CustomerForm dialog
    const chatButton = screen.queryByRole("button", { name: /start-conversation|conversation/i });
    if (chatButton) {
      await user.click(chatButton);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }

    // Clicking the explicit Pencil edit button should open the CustomerForm dialog
    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);

    // Now the dialog should be open
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Close the dialog (cancel/close button)
    const closeButtons = screen.getAllByRole("button");
    const closeBtn = closeButtons.find(
      (btn) =>
        btn.getAttribute("aria-label")?.toLowerCase().includes("close") ||
        btn.textContent?.toLowerCase().includes("cancel"),
    );
    if (closeBtn) {
      await user.click(closeBtn);
    } else {
      await user.keyboard("{Escape}");
    }

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Clicking customer row text (Alice) should open the edit form
    const nameCell = screen.getByText("Alice");
    await user.click(nameCell);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("search", () => {
    const lastSearch = () => vi.mocked(searchCustomers).mock.calls.at(-1)?.[0];

    it("lists everyone at first and searches every attribute by itself once typing pauses", async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
      expect(lastSearch()).toMatchObject({ term: "", field: undefined });

      await user.type(screen.getByRole("textbox", { name: /search-placeholder/ }), "ali");
      // Not at once: the search waits for the pause in typing.
      expect(lastSearch()?.term).toBe("");
      await waitFor(() => expect(lastSearch()).toMatchObject({ term: "ali", field: undefined }), {
        timeout: 3000,
      });
    });

    it("searches at once on Enter, without waiting for the pause", async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

      await user.type(screen.getByRole("textbox", { name: /search-placeholder/ }), "alice@{Enter}");
      await waitFor(() => expect(lastSearch()).toMatchObject({ term: "alice@", field: undefined }), {
        timeout: 500,
      });
    });
  });
});
