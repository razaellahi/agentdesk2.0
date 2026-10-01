import { describe, expect, it } from "vitest";
import { resolveTenant, tenantFromHostname, tenantOfUser } from "./resolveTenant";

const cfg = {
  TENANT_MODE: "subdomain" as const,
  TENANT_ID: "",
  ROOT_DOMAIN: "expertflow.com",
  DEFAULT_TENANT: "expertflow",
};
const loc = (hostname: string, search = "") => ({ hostname, search });

describe("resolveTenant", () => {
  it("uses the left-most subdomain under ROOT_DOMAIN", () => {
    expect(resolveTenant(cfg, loc("acme.expertflow.com"))).toBe("acme");
    expect(resolveTenant(cfg, loc("acme.eu.expertflow.com"))).toBe("acme");
  });

  it("falls back to DEFAULT_TENANT for the bare root, IPs and localhost", () => {
    expect(resolveTenant(cfg, loc("expertflow.com"))).toBe("expertflow");
    expect(resolveTenant(cfg, loc("192.168.1.10"))).toBe("expertflow");
    expect(resolveTenant(cfg, loc("localhost"))).toBe("expertflow");
  });

  it("fixed mode always uses TENANT_ID", () => {
    expect(
      resolveTenant({ ...cfg, TENANT_MODE: "fixed", TENANT_ID: "bank" }, loc("acme.expertflow.com")),
    ).toBe("bank");
  });

  it("header mode reads ?tenant= from the embedding host", () => {
    expect(resolveTenant({ ...cfg, TENANT_MODE: "header" }, loc("crm.local", "?tenant=telco"))).toBe("telco");
  });

  it("without ROOT_DOMAIN uses the first label of a 3+ label host", () => {
    expect(tenantFromHostname("acme.cx.example.org", "")).toBe("acme");
    expect(tenantFromHostname("example.org", "")).toBeNull();
  });
});

describe("tenantOfUser", () => {
  it("prefers the tenant name, then id", () => {
    expect(tenantOfUser({ tenant: { id: "1", name: "acme" } })).toBe("acme");
    expect(tenantOfUser({ tenant: { id: "abc", name: null } })).toBe("abc");
    expect(tenantOfUser({ tenant: null })).toBeNull();
  });
});
