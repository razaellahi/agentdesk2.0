import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { caseDb } from "@/test/msw/cases";
import { renderCase, signIn, useCaseBackend } from "../test/harness";
import CaseAdminPage from "./CaseAdminPage";

const open = (section = "statuses") =>
  renderCase(<CaseAdminPage />, { path: `/cases/admin?section=${section}`, route: "/cases/admin" });

describe("Case settings", () => {
  useCaseBackend();

  it("adds a custom status and toggles SLA pause on an existing one", async () => {
    signIn("admin");
    const user = userEvent.setup();
    open();
    expect(await screen.findByText("NEW")).toBeInTheDocument();
    await user.type(screen.getByLabelText("New status label"), "Waiting vendor");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Status created")).toBeInTheDocument();
    expect(caseDb.statuses.at(-1)).toMatchObject({
      label: "Waiting vendor",
      statusCategory: "PENDING",
      pausesSla: true,
    });
    await user.click(screen.getByRole("switch", { name: "Pauses SLA for In progress" }));
    await waitFor(() => expect(caseDb.statuses.find((s) => s.code === "IN_PROGRESS")!.pausesSla).toBe(true));
  });

  it("switches sections from the settings menu and saves distribution", async () => {
    signIn("admin");
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("button", { name: /Distribution/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("section=distribution");
    await user.click(await screen.findByRole("radio", { name: /Auto distribution/ }));
    await user.click(screen.getByRole("button", { name: "Save distribution settings" }));
    await waitFor(() => expect(caseDb.settings.distributionMode).toBe("AUTO"));
    expect(caseDb.settings.agentClaimEnabled).toBe(true);
  });

  it("maps a sub-category to a Keycloak routing group", async () => {
    signIn("admin");
    const user = userEvent.setup();
    open("mapping");
    const select = await screen.findByLabelText("Routing group for Service request");
    await user.selectOptions(select, "technical");
    const row = select.closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(
        caseDb.categories.flatMap((c) => c.subCategories).find((s) => s.id === "sub-service")!.routingRule
          ?.keycloakGroupId,
      ).toBe("technical"),
    );
  });

  it("validates tenant policy bounds before saving", async () => {
    signIn("admin");
    const user = userEvent.setup();
    open("policy");
    const audit = await screen.findByLabelText("Audit retention");
    await user.clear(audit);
    await user.type(audit, "10");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter a value between 30 and 730 days.")).toBeInTheDocument();
    expect(caseDb.settings.auditRetentionDays).toBe(90);
    await user.clear(audit);
    await user.type(audit, "120");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(caseDb.settings.auditRetentionDays).toBe(120));
  });

  it("shows the SLA matrix with inherited default cells", async () => {
    signIn("admin");
    open("sla");
    expect(await screen.findByText("At a glance")).toBeInTheDocument();
    const vipRow = screen.getByRole("rowheader", { name: "VIP" }).closest("tr")!;
    expect(within(vipRow).getByText("1h")).toBeInTheDocument();
    const goldRow = screen.getByRole("rowheader", { name: "Gold" }).closest("tr")!;
    // Gold has no own High threshold, so it inherits the default 4h.
    expect(within(goldRow).getByText("4h")).toHaveClass("border-dashed");
  });
});
