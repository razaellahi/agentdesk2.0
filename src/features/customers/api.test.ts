import { describe, expect, it } from "vitest";
import { asCustomerPage, asLabels } from "./api";

describe("customer payloads", () => {
  it("reads a customer page from the root or a data wrapper", () => {
    expect(asCustomerPage({ docs: [{ firstName: "Ada" }], totalDocs: 1 }).totalDocs).toBe(1);
    expect(asCustomerPage({ data: { docs: [], totalDocs: 4 } }).totalDocs).toBe(4);
    expect(asCustomerPage(null).docs).toEqual([]);
  });

  it("reads labels from an array or docs", () => {
    expect(asLabels([{ _id: "1", name: "VIP", colorCode: "#f00" }])).toHaveLength(1);
    expect(asLabels({ docs: [{ _id: "2", name: "New", colorCode: "#0f0" }] })).toHaveLength(1);
  });
});
