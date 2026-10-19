import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasOptOutLabel, startOutboundSms } from "./outbound";

const mock = vi.hoisted(() => ({
  ccmGet: vi.fn(),
  ccmPost: vi.fn(),
  customerGet: vi.fn(),
  dnc: vi.fn(),
  owner: "agent-1",
  allowed: true,
  settings: { outboundSms: true, smsPrefixCode: "+92", callingCompliance: true },
}));
vi.mock("@/core/api", () => ({
  ccmApi: { get: mock.ccmGet, post: mock.ccmPost },
  cimCustomerApi: { get: mock.customerGet },
  unifiedAdminApi: { post: mock.dnc },
}));
vi.mock("@/config", () => ({ getConfig: () => ({ isCallingComplianceEnabled: false }) }));
vi.mock("@/core/auth", () => ({
  can: () => mock.allowed,
  getSession: () => ({ user: { id: mock.owner, username: "agent", firstName: "Sana" } }),
}));
vi.mock("@/core/agent-settings", () => ({ getDeskSettings: () => mock.settings }));
vi.mock("../api", () => ({ sendOutboundSms: vi.fn() }));
vi.mock("../store/schemaStore", () => ({
  useSchemaStore: { getState: () => ({ channelTypes: [{ id: "sms-type", name: "SMS" }] }) },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.owner = "agent-1";
  mock.allowed = true;
  mock.ccmGet.mockImplementation((path) =>
    Promise.resolve(
      path === "/channels"
        ? [{ serviceIdentifier: "support", channelType: { name: "SMS" } }]
        : { serviceIdentifier: "support" },
    ),
  );
  mock.customerGet.mockResolvedValue({ docs: [] });
  mock.dnc.mockResolvedValue({ blocked: false });
  mock.ccmPost.mockResolvedValue({});
});
const input = { destination: "03001234567", from: "support", text: "Hello" };
describe("current outbound SMS contract", () => {
  it("normalizes before lookup/DNC and sends the source receive envelope", async () => {
    await startOutboundSms(input);
    expect(mock.customerGet).toHaveBeenCalledWith(
      "/customers",
      expect.objectContaining({
        searchParams: expect.objectContaining({ paginateQuery: "phoneNumber:+923001234567" }),
      }),
    );
    expect(mock.dnc).toHaveBeenCalledWith("/compliance-dnc/check", {
      identifierType: "PHONE",
      channel: "SMS",
      value: "+923001234567",
    });
    expect(mock.ccmPost).toHaveBeenCalledWith(
      "/message/receive",
      expect.objectContaining({
        header: expect.objectContaining({
          intent: "AGENT_OUTBOUND",
          customer: null,
          sender: expect.objectContaining({ id: "agent-1" }),
          channelData: {
            channelCustomerIdentifier: "+923001234567",
            serviceIdentifier: "support",
            additionalAttributes: [{ key: "agentId", type: "String100", value: "agent-1" }],
          },
        }),
        body: { type: "PLAIN", markdownText: "Hello" },
      }),
    );
  });
  it("refuses opt-out matches, unconfigured From, ambiguous matches and failed compliance", async () => {
    mock.customerGet.mockResolvedValue({ docs: [{ labels: ["opt-out"] }] });
    await expect(startOutboundSms(input)).rejects.toThrow("OPT_OUT");
    await expect(startOutboundSms({ ...input, from: "unconfigured" })).rejects.toThrow("configured");
    mock.customerGet.mockResolvedValue({ docs: [{ _id: "a" }, { _id: "b" }] });
    await expect(startOutboundSms(input)).rejects.toThrow("matching customer");
    mock.customerGet.mockResolvedValue({ docs: [] });
    mock.dnc.mockRejectedValue(new Error("Unavailable"));
    await expect(startOutboundSms(input)).rejects.toThrow("DNC_CHECK_FAILED");
    expect(mock.ccmPost).not.toHaveBeenCalled();
  });
  it("does not send a previous agent's draft when identity changes during compliance", async () => {
    mock.dnc.mockImplementation(() => {
      mock.owner = "agent-2";
      return Promise.resolve({ blocked: false });
    });
    await expect(startOutboundSms(input)).rejects.toThrow("session changed");
    expect(mock.ccmPost).not.toHaveBeenCalled();
  });
});

describe("hasOptOutLabel", () => {
  it("finds the opt-out label as an id, a name or a plain string", () => {
    expect(hasOptOutLabel({ labels: [{ _id: "opt-out" }] })).toBe(true);
    expect(hasOptOutLabel({ labels: [{ name: "Opt Out" }] })).toBe(true);
    expect(hasOptOutLabel({ labels: ["opt-out"] })).toBe(true);
    expect(hasOptOutLabel({ labels: [{ name: "VIP" }] })).toBe(false);
  });

  it("does not throw when the server's labels are not an array", () => {
    expect(hasOptOutLabel({ labels: { name: "Opt Out" } })).toBe(true);
    expect(hasOptOutLabel({ labels: "opt-out" })).toBe(true);
    expect(hasOptOutLabel({ labels: { name: "VIP" } })).toBe(false);
    expect(hasOptOutLabel({ labels: 7 })).toBe(false);
    expect(hasOptOutLabel({ labels: null })).toBe(false);
    expect(hasOptOutLabel({})).toBe(false);
    expect(hasOptOutLabel(null)).toBe(false);
  });
});
