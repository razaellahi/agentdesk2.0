import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderCase, signIn, useCaseBackend } from "../test/harness";
import { LinkedConversations } from "./LinkedConversations";

const base = {
  id: "l1",
  interactionId: "conv-1",
  linkedAt: "2026-10-19T09:00:00Z",
  customerName: "Amina",
  agentName: "Sana",
  channel: "WHATSAPP",
};

describe("LinkedConversations", () => {
  useCaseBackend();

  it("lists the conversation id and collapses a long AI summary behind Show more", async () => {
    const summary = "The customer called about a duplicated charge. ".repeat(6);
    const user = userEvent.setup();
    renderCase(
      <LinkedConversations
        conversations={[{ ...base, summary, summaryAt: "2026-10-19T09:30:00Z" }]}
        fallbackName="Customer"
        currentInteractionId="conv-1"
      />,
    );
    expect(screen.getByText(/WHATSAPP · .* · conv-1/)).toBeInTheDocument();
    expect(screen.getByText("AI summary")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Show more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
  });

  it("shows a short summary in full and omits the toggle", () => {
    renderCase(
      <LinkedConversations
        conversations={[{ ...base, summary: "Short summary." }]}
        fallbackName="Customer"
      />,
    );
    expect(screen.getByText("Short summary.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show/ })).not.toBeInTheDocument();
  });

  it("opens the customer's conversation in the desk at the moment the case was linked", async () => {
    signIn("agent");
    const user = userEvent.setup();
    renderCase(
      <LinkedConversations conversations={[base]} fallbackName="Customer" customerProfileId="customer-a" />,
    );
    await user.click(screen.getByRole("button", { name: "Open conversation" }));
    const params = new URLSearchParams(screen.getByTestId("location").textContent!.split("?")[1]);
    expect(screen.getByTestId("location").textContent).toMatch(/^\/conversations\?/);
    expect(Object.fromEntries(params)).toEqual({
      customer: "customer-a",
      name: "Amina",
      at: "2026-10-19T09:00:00Z",
    });
  });

  it("shows why it cannot open when the case has no customer profile", () => {
    signIn("agent");
    renderCase(<LinkedConversations conversations={[base]} fallbackName="Customer" />);
    expect(screen.getByRole("button", { name: "Open conversation" })).toBeDisabled();
    expect(screen.getByTitle(/no customer profile/)).toBeInTheDocument();
  });

  it("shows why it cannot open without the agent or supervisor role", () => {
    signIn("admin");
    renderCase(
      <LinkedConversations conversations={[base]} fallbackName="Customer" customerProfileId="customer-a" />,
    );
    expect(screen.getByRole("button", { name: "Open conversation" })).toBeDisabled();
    expect(screen.getByTitle(/agent or supervisor role/)).toBeInTheDocument();
  });
});
