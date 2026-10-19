import { describe, expect, it } from "vitest";
import { hydrateLabels } from "./api";

const all = [
  { _id: "vip", name: "VIP", colorCode: "green" },
  { _id: "cb", name: "Call back", colorCode: "orange" },
];

describe("hydrateLabels", () => {
  it("turns stored ids into label objects, in the customer's order", () => {
    expect(hydrateLabels(["cb", "vip"], all).map((label) => label.name)).toEqual(["Call back", "VIP"]);
  });

  it("keeps labels that already arrive as objects and drops unknown ids and repeats", () => {
    const inline = { _id: "x", name: "Inline", colorCode: "red" };
    expect(
      hydrateLabels([inline, "vip", "vip", "gone", { _id: "cb" }], all).map((label) => label.name),
    ).toEqual(["Inline", "VIP", "Call back"]);
  });

  it("is empty for a customer without labels", () => {
    expect(hydrateLabels(undefined, all)).toEqual([]);
    expect(hydrateLabels([], all)).toEqual([]);
  });
});
