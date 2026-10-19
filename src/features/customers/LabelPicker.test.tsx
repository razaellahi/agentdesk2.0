import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LabelPicker, labelIds } from "./LabelPicker";

const mocks = vi.hoisted(() => ({
  create: vi.fn(async (label: { name: string }) => ({ _id: `new-${label.name}`, colorCode: "x", ...label })),
}));

vi.mock("@/core/auth", () => ({ getSession: () => ({ user: { username: "agent" } }) }));
vi.mock("./api", () => ({
  listLabels: async () => [
    { _id: "vip", name: "VIP", colorCode: "green" },
    { _id: "callback", name: "Call back", colorCode: "orange" },
  ],
  createLabelForCustomer: mocks.create,
}));

function Harness({ initial = [] as string[] }) {
  const [value, setValue] = useState(initial);
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LabelPicker value={value} onChange={setValue} />
      <output data-testid="value">{value.join(",")}</output>
    </QueryClientProvider>
  );
}

// cmdk measures and scrolls its list; jsdom has neither.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView ??= () => {};

describe("LabelPicker", () => {
  it("normalises hydrated and plain label values to ids", () => {
    expect(labelIds([{ _id: "a" }, "b", null, {}])).toEqual(["a", "b"]);
    expect(labelIds(undefined)).toEqual([]);
  });

  it("selects and removes existing labels", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { expanded: false }));
    await user.click(await screen.findByRole("option", { name: /VIP/ }));
    expect(screen.getByTestId("value")).toHaveTextContent("vip");
    await user.click(screen.getByRole("button", { name: /delete.*VIP/i }));
    expect(screen.getByTestId("value")).toBeEmptyDOMElement();
  });

  it("offers to create a label that does not exist, and selects it", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["vip"]} />);
    await user.click(screen.getByRole("button", { expanded: false }));
    await user.type(await screen.findByRole("combobox"), "Escalated");
    await user.click(await screen.findByRole("option", { name: /Escalated/ }));
    await waitFor(() => expect(screen.getByTestId("value")).toHaveTextContent("vip,new-Escalated"));
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Escalated", createdBy: "agent" }),
    );
  });

  it("does not offer to create a name that already exists", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { expanded: false }));
    await user.type(await screen.findByRole("combobox"), "vip");
    expect(await screen.findByRole("option", { name: /VIP/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /add/i })).not.toBeInTheDocument();
  });
});
