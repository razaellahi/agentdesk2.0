import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { caseDb } from "@/test/msw/cases";
import { renderCase, signIn, useCaseBackend } from "../test/harness";
import { CasesTab, type CaseConversationContext } from "./CasesTab";

const context = (patch: Partial<CaseConversationContext> = {}): CaseConversationContext => ({
  interactionId: "a",
  customerProfileId: "customer-a",
  customerName: "Amina Raza",
  channel: "WEB",
  agentName: "Sana Iqbal",
  ...patch,
});

describe("conversation Cases tab", () => {
  const server = useCaseBackend();

  it("lists the customer's cases and filters open / closed", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(<CasesTab context={context()} />);
    expect(await screen.findByText("Card payment declined twice")).toBeInTheDocument();
    expect(screen.getByText("Refund not received")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.queryByText("Refund not received")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Closed" }));
    expect(screen.getByText("Refund not received")).toBeInTheDocument();
    expect(screen.queryByText("Card payment declined twice")).not.toBeInTheDocument();
  });

  it("links the active conversation to an existing case after confirmation", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(<CasesTab context={context()} />);
    const card = (await screen.findByText("Card payment declined twice")).closest("article")!;
    await user.click(within(card).getByRole("button", { name: "Link conversation" }));
    await user.click(await screen.findByRole("button", { name: "Link conversation" }));
    expect(await screen.findByText("Conversation linked to CASE-20261019-00001.")).toBeInTheDocument();
    const linked = caseDb.cases.find((c) => c.id === "case-1")!.conversations[0]!;
    expect(linked).toMatchObject({
      interactionId: "a",
      customerName: "Amina Raza",
      agentName: "Sana Iqbal",
      channel: "WEB",
    });
    // The conversation now has its case: no second case can be started from it.
    await waitFor(() => expect(screen.getByTestId("linked-conversation-banner")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "New case" })).not.toBeInTheDocument();
  });

  it("shows the case already linked to this conversation", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(
      <CasesTab
        context={context({ interactionId: "b", customerProfileId: "customer-b", customerName: "Bilal" })}
      />,
    );
    const banner = await screen.findByTestId("linked-conversation-banner");
    expect(within(banner).getByText(/Router keeps dropping/)).toBeInTheDocument();
    await user.click(within(banner).getByRole("button", { name: "Open case" }));
    expect(await screen.findByText("Conversation linked")).toBeInTheDocument();
  });

  it("creates a case from the conversation with routing preview", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(<CasesTab context={context()} />);
    await user.click(await screen.findByRole("button", { name: "New case" }));
    await user.type(screen.getByLabelText(/Title/), "Wrong amount charged");
    await user.selectOptions(screen.getByLabelText(/^Category/), "cat-billing");
    await user.selectOptions(screen.getByLabelText(/^Sub-category/), "sub-refund");
    expect(await screen.findByText("Auto-routed to group: billing (routing rule)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create case" }));
    expect(await screen.findByText("Case created")).toBeInTheDocument();
    const created = caseDb.cases.at(-1)!;
    expect(created).toMatchObject({
      title: "Wrong amount charged",
      customerProfileId: "customer-a",
      assignedGroupId: "billing",
    });
    expect(created.conversations[0]?.interactionId).toBe("a");
    expect(screen.getByText(created.caseReferenceId)).toBeInTheDocument();
  });

  it("posts a comment from the case detail", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(<CasesTab context={context()} />);
    await user.click(await screen.findByText("Card payment declined twice"));
    expect(await screen.findByText("Please check with the gateway, @Sana Iqbal.")).toBeInTheDocument();
    const editor = screen.getByRole("textbox", { name: "Write a comment… Type @ to mention" });
    await user.click(editor);
    await user.keyboard("Customer sent a screenshot");
    await user.click(screen.getByRole("button", { name: "Post comment" }));
    expect(await screen.findByText("Comment posted.")).toBeInTheDocument();
    expect(caseDb.cases[0]!.comments.at(-1)).toMatchObject({
      body: "Customer sent a screenshot",
      authorUserId: "u-agent-1",
    });
  });

  it("shows the case history with comments, and new links appear in it", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(<CasesTab context={context()} />);
    await user.click(await screen.findByText("Card payment declined twice"));
    const activity = await screen.findByRole("region", { name: "Case activity" });
    await user.click(within(activity).getByRole("tab", { name: "History" }));
    expect(await within(activity).findByText(/Status changed:/)).toBeInTheDocument();
    expect(within(activity).getByText("CASE-20261019-00001")).toBeInTheDocument();
    expect(
      within(activity).queryByText("Please check with the gateway, @Sana Iqbal."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Link active conversation" }));
    await user.click(await screen.findByRole("button", { name: "Link conversation" }));
    expect(await within(activity).findByText("Conversation linked")).toBeInTheDocument();
  });

  it("falls back to case milestones when the audit log belongs to another team", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(
      <CasesTab
        context={context({ interactionId: "b", customerProfileId: "customer-b", customerName: "Bilal" })}
      />,
    );
    const banner = await screen.findByTestId("linked-conversation-banner");
    await user.click(within(banner).getByRole("button", { name: "Open case" }));
    const activity = await screen.findByRole("region", { name: "Case activity" });
    await user.click(within(activity).getByRole("tab", { name: "History" }));
    expect(
      await within(activity).findByText(
        "Showing key milestones. The full history is visible to the case's team.",
      ),
    ).toBeInTheDocument();
    expect(within(activity).getByText("Conversation linked")).toBeInTheDocument();
    expect(within(activity).getByText("WHATSAPP")).toBeInTheDocument();
    expect(within(activity).getByText("CASE-20261019-00003")).toBeInTheDocument();
  });

  it("lists the cases of a customer opened from the customer list, without linking", async () => {
    signIn("agent");
    renderCase(
      <CasesTab
        context={context({
          interactionId: null,
          customerProfileId: "customer-amina",
          customerName: "Amina Raza",
        })}
      />,
    );
    expect(await screen.findByText("Delivery address change")).toBeInTheDocument();
    expect(screen.getByText("Loyalty points missing")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Link conversation" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("linked-conversation-banner")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New case" })).toBeInTheDocument();
  });

  it("explains an unreachable case backend instead of showing the gateway error", async () => {
    signIn("agent");
    server.use(http.post("*/case-api/graphql", () => new HttpResponse("Bad Gateway", { status: 502 })));
    renderCase(<CasesTab context={context({ interactionId: null })} />);
    expect(await screen.findByText(/Case Management is not reachable right now \(502\)/)).toBeInTheDocument();
  });

  it("states the customer's recent window and open cases, and counts search results", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(<CasesTab context={context()} />);
    expect(await screen.findByText("last 72h · 1 open")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Search by reference or title…"), "refund");
    expect(await screen.findByText("1 result")).toBeInTheDocument();
  });

  it("searches the customer's cases in every status, with no scope or closed toggles", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(<CasesTab context={context()} />);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Search by reference or title…"), "refund");
    // "Refund not received" is resolved; search finds it without any toggle.
    expect(await screen.findByText("Refund not received", { selector: "span" })).toBeInTheDocument();
  });

  it("hints at the reference format while a CASE- reference is being typed", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(<CasesTab context={context()} />);
    const input = screen.getByPlaceholderText("Search by reference or title…");
    await user.type(input, "case-2026");
    expect(screen.getByText("Tip: full references look like CASE-20260807-00001")).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, "CASE-20261019-00001");
    expect(
      screen.getByText("Looks like a case reference. Exact matches search all cases."),
    ).toBeInTheDocument();
  });

  it("copies a case reference when it is clicked, without opening the case", async () => {
    signIn("agent");
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderCase(<CasesTab context={context()} />);
    await user.click(await screen.findByRole("button", { name: "Copy reference CASE-20261019-00001" }));
    expect(writeText).toHaveBeenCalledWith("CASE-20261019-00001");
    expect(screen.queryByText("Case details")).not.toBeInTheDocument();
  });

  it("disables New case when the conversation has no customer profile", async () => {
    signIn("agent");
    renderCase(<CasesTab context={context({ customerProfileId: null, customerName: null })} />);
    expect(await screen.findByText(/Link a customer profile/)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "New case" })).toBeDisabled();
  });

  it("offers Create another after a case is created", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(<CasesTab context={context()} />);
    await user.click(await screen.findByRole("button", { name: "New case" }));
    await user.type(screen.getByLabelText(/Title/), "First");
    await user.selectOptions(screen.getByLabelText(/^Category/), "cat-billing");
    await user.selectOptions(screen.getByLabelText(/^Sub-category/), "sub-refund");
    await user.click(screen.getByRole("button", { name: "Create case" }));
    await user.click(await screen.findByRole("button", { name: "Create another" }));
    expect(screen.getByLabelText(/Title/)).toHaveValue("");
    expect(screen.queryByText("Case created")).not.toBeInTheDocument();
  });
});
