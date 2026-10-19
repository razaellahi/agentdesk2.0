import { beforeEach, describe, expect, it, vi } from "vitest";
import { conversationFixture } from "@/test/conversations";
import { useConversationStore } from "../store/conversationStore";
import { refreshConversationCustomer } from "./refreshCustomer";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  link: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/core/api", () => ({ cimCustomerApi: { get: mocks.get } }));
vi.mock("../api", () => ({ linkConversationCustomer: mocks.link }));

describe("refreshConversationCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const a = conversationFixture("conv-a", "Amina");
    a.customer = { _id: "cust-1", firstName: "Amina", labels: [] };
    const other = conversationFixture("conv-b", "Bilal");
    other.customer = { _id: "cust-2", firstName: "Bilal", labels: [] };
    useConversationStore.setState({ byId: { "conv-a": a, "conv-b": other }, order: ["conv-a", "conv-b"] });
  });

  it("puts the saved profile (with its labels) into the customer's conversations and tells the server", async () => {
    mocks.get.mockResolvedValue({ _id: "cust-1", firstName: "Amina", labels: ["vip"] });
    await refreshConversationCustomer("cust-1", "conv-a");
    const { byId } = useConversationStore.getState();
    expect(byId["conv-a"]!.customer.labels).toEqual(["vip"]);
    expect(byId["conv-b"]!.customer.labels).toEqual([]);
    expect(mocks.link).toHaveBeenCalledWith("conv-a", expect.objectContaining({ labels: ["vip"] }));
  });
});
