import { describe, expect, it } from "vitest";
import { baseRawConfig, makeConfig } from "@/test/fixtures";
import { ConfigError, parseConfig, rewriteHostsToOrigin } from "./loadConfig";

describe("parseConfig", () => {
  it("applies defaults for optional keys", () => {
    const config = makeConfig();
    expect(config.TENANT_MODE).toBe("subdomain");
    expect(config.DEFAULT_THEME).toBe("system");
    expect(config.DEPLOYMENT_PROFILE).toBe("EFCX");
    expect(config.getQueuesDelay).toBe(15);
    expect(config.MAX_BOARD_PANES).toBe(3);
  });

  it("coerces envsubst string values (booleans, numbers, empty strings)", () => {
    const config = makeConfig({
      feature_CIM_33144_quick_replies: "true",
      isCallingComplianceEnabled: "false",
      SOCKET_TIMEOUT: "15000",
      getQueuesDelay: "",
      DEFAULT_THEME: "DARK",
      DEPLOYMENT_PROFILE: "cisco",
      MAX_BOARD_PANES: "9",
    });
    expect(config.feature_CIM_33144_quick_replies).toBe(true);
    expect(config.isCallingComplianceEnabled).toBe(false);
    expect(config.SOCKET_TIMEOUT).toBe(15000);
    expect(config.getQueuesDelay).toBe(15);
    expect(config.DEFAULT_THEME).toBe("dark");
    expect(config.DEPLOYMENT_PROFILE).toBe("CISCO");
    expect(config.MAX_BOARD_PANES).toBe(3);
  });

  it("lists every missing required service URL", () => {
    const { GAT_URL: _g, CCM_URL: _c, ...rest } = baseRawConfig;
    try {
      parseConfig(rest);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const issues = (error as ConfigError).issues.join("\n");
      expect(issues).toContain("GAT_URL");
      expect(issues).toContain("CCM_URL");
    }
  });

  it("rejects an invalid enum value", () => {
    expect(() => makeConfig({ TENANT_MODE: "cookie" })).toThrow(ConfigError);
  });
});

describe("rewriteHostsToOrigin", () => {
  it("rewrites service hosts to the page FQDN (multi-tenant hosts)", () => {
    const out = rewriteHostsToOrigin(baseRawConfig, { hostname: "acme.expertflow.com", protocol: "https:" });
    expect(out.GAT_URL).toBe("https://acme.expertflow.com/agent-manager");
    expect(out.FILE_SERVER_URL).toBe("https://acme.expertflow.com/file-engine/1");
  });

  it("keeps remote URLs on localhost", () => {
    const out = rewriteHostsToOrigin(baseRawConfig, { hostname: "localhost", protocol: "http:" });
    expect(out.GAT_URL).toBe(baseRawConfig.GAT_URL);
  });

  it("leaves relative and non-http values alone", () => {
    const out = rewriteHostsToOrigin(
      { ...baseRawConfig, VRS_URL: "/vrs", SIP_SOCKET_URL: "wss://10.0.0.1:7443" },
      { hostname: "acme.expertflow.com", protocol: "https:" },
    );
    expect(out.VRS_URL).toBe("/vrs");
    expect(out.SIP_SOCKET_URL).toBe("wss://10.0.0.1:7443");
  });
});
