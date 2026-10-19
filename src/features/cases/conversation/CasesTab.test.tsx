import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
  useCaseBackend();

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
    expect(await screen.findByRole("button", { name: "Conversation linked" })).toBeDisabled();
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
});
