import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { caseDb } from "@/test/msw/cases";
import { renderCase, signIn, useCaseBackend } from "../test/harness";
import { CaseNotificationsMenu } from "./CaseNotificationsMenu";

describe("case notifications", () => {
  useCaseBackend();

  it("shows unread SLA and mention alerts and opens the case in the Workbench", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(<CaseNotificationsMenu />);
    await user.click(await screen.findByRole("button", { name: "Case notifications, 2 unread" }));
    expect(await screen.findByText("CASE-20261019-00003 breached its SLA")).toBeInTheDocument();
    expect(screen.getByText("Please check with the gateway, @Sana Iqbal.")).toBeInTheDocument();
    await user.click(screen.getByText("Omar Khan mentioned you on CASE-20261019-00001"));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/cases?caseId=case-1"));
    expect(caseDb.notifications.find((n) => n.id === "n-1")!.isRead).toBe(true);
  });

  it("is hidden for users without a case role", () => {
    signIn("viewer");
    renderCase(<CaseNotificationsMenu />);
    expect(screen.queryByRole("button", { name: /Case notifications/ })).not.toBeInTheDocument();
  });
});
