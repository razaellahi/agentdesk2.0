import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { caseDb } from "@/test/msw/cases";
import { renderCase, signIn, useCaseBackend } from "../test/harness";
import WorkbenchPage from "./WorkbenchPage";

const rowFor = (title: string) => screen.getByText(title).closest("tr")!;

describe("case Workbench", () => {
  useCaseBackend();

  it("opens on the unassigned pool with the supervisor team strip", async () => {
    signIn("supervisor");
    renderCase(<WorkbenchPage />, { path: "/cases", route: "/cases" });
    expect(await screen.findByText("Router keeps dropping")).toBeInTheDocument();
    expect(screen.getByText("Update billing address")).toBeInTheDocument();
    // Assigned cases are outside the unassigned pool.
    expect(screen.queryByText("Card payment declined twice")).not.toBeInTheDocument();
    const teams = await screen.findByLabelText("Your teams");
    expect(within(teams).getByText("Technical")).toBeInTheDocument();
  });

  it("claims a case from the unassigned list and opens it in the pane", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(<WorkbenchPage />, { path: "/cases", route: "/cases" });
    await screen.findByText("Update billing address");
    await user.click(within(rowFor("Update billing address")).getByRole("button", { name: "Claim" }));
    await waitFor(() =>
      expect(caseDb.cases.find((c) => c.id === "case-4")!.assignedUserId).toBe("u-agent-1"),
    );
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/cases?caseId=case-4"));
    expect(await screen.findByRole("complementary", { name: "Case details" })).toBeInTheDocument();
  });

  it("applies dashboard drill links and switches list views", async () => {
    signIn("supervisor");
    const user = userEvent.setup();
    renderCase(<WorkbenchPage />, { path: "/cases?listView=all&priority=CRITICAL", route: "/cases" });
    expect(await screen.findByText("Router keeps dropping")).toBeInTheDocument();
    expect(screen.queryByText("Update billing address")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(await screen.findByText("Update billing address")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Closed work/ }));
    expect(await screen.findByText("Refund not received")).toBeInTheDocument();
  });

  it("bulk-resolves selected cases and reports failures per case", async () => {
    signIn("supervisor");
    const user = userEvent.setup();
    renderCase(<WorkbenchPage />, { path: "/cases?listView=all", route: "/cases" });
    await screen.findByText("Card payment declined twice");
    await user.click(within(rowFor("Card payment declined twice")).getByRole("checkbox"));
    await user.click(within(rowFor("Duplicate invoice")).getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Resolve selected" }));
    expect(await screen.findByText("2 succeeded · 0 failed")).toBeInTheDocument();
    expect(
      caseDb.cases
        .filter((c) => c.status.code === "RESOLVED")
        .map((c) => c.id)
        .sort(),
    ).toEqual(["case-1", "case-2", "case-5"]);
  });

  it("updates a case to a new status with a note from the pane", async () => {
    signIn("supervisor");
    const user = userEvent.setup();
    renderCase(<WorkbenchPage />, { path: "/cases?listView=all&caseId=case-1", route: "/cases" });
    const pane = await screen.findByRole("complementary", { name: "Case details" });
    expect(await within(pane).findByText("Please check with the gateway, @Sana Iqbal.")).toBeInTheDocument();
    await user.selectOptions(await within(pane).findByLabelText("Submit as status"), "st-pending_customer");
    // Pending needs a note.
    expect(within(pane).getByRole("button", { name: "Submit as Pending customer" })).toBeDisabled();
    await user.click(
      within(pane).getByRole("textbox", { name: "Write an internal note… Type @ to mention" }),
    );
    await user.keyboard("Waiting for the bank statement");
    await user.click(within(pane).getByRole("button", { name: "Submit as Pending customer" }));
    await waitFor(() => expect(caseDb.cases[0]!.status.code).toBe("PENDING_CUSTOMER"));
    expect(caseDb.cases[0]!.comments.at(-1)?.body).toBe("Waiting for the bank statement");
  });
});
