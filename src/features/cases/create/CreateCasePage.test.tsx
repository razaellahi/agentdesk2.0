import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { caseDb } from "@/test/msw/cases";
import { renderCase, signIn, useCaseBackend } from "../test/harness";
import CreateCasePage from "./CreateCasePage";

async function pick(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: label }));
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("Create case", () => {
  useCaseBackend();

  it("walks details → classification → review and creates a routed, customer-linked case", async () => {
    signIn("supervisor");
    const user = userEvent.setup();
    const seeded = caseDb.cases.length;
    renderCase(<CreateCasePage />, { path: "/cases/new", route: "/cases/new" });

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await user.type(screen.getByLabelText("Title"), "Chargeback dispute");
    await user.click(screen.getByRole("radio", { name: /P2 High/ }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    await pick(user, "Category", "Billing");
    await pick(user, "Sub-category", "Payment failure");
    expect(await screen.findByText("billing")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search by name, email, phone or profile…"), "Ami");
    await user.click(await screen.findByRole("option", { name: /Amina Raza/ }));
    expect(
      await screen.findByText("This customer has 1 open case. Check for duplicates before creating."),
    ).toBeInTheDocument();
    expect(screen.getByText("VIP", { selector: "span.rounded-full.bg-primary-soft" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Interaction 1"), "conv-778899");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Chargeback dispute")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create case" }));
    const dialog = await screen.findByRole("dialog", { name: "Create this case?" });
    await user.click(within(dialog).getByRole("button", { name: "Create case" }));

    await waitFor(() => expect(caseDb.cases).toHaveLength(seeded + 1));
    const created = caseDb.cases.at(-1)!;
    expect(created).toMatchObject({
      title: "Chargeback dispute",
      priority: "High",
      customerProfileId: "customer-a",
      assignedGroupId: "billing",
    });
    expect(created.conversations[0]?.interactionId).toBe("conv-778899");
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(`/cases?caseId=${created.id}`),
    );
  });
});
