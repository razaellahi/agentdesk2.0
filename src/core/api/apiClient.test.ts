import { afterEach, describe, expect, it, vi } from "vitest";
import { configureApiAuth, createServiceClient } from "./apiClient";

afterEach(() => {
  vi.unstubAllGlobals();
  configureApiAuth({
    getAccessToken: () => null,
    getAgentId: () => null,
    refresh: async () => false,
    onUnauthorized: () => {},
  });
});
describe("service authorization failures", () => {
  it("discards a successful response received after the identity changes", async () => {
    let owner = "agent-a";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        owner = "agent-b";
        return new Response('{"private":"old user data"}');
      }),
    );
    configureApiAuth({
      getAccessToken: () => "token",
      getAgentId: () => owner,
      refresh: async () => true,
      onUnauthorized: () => {},
    });
    await expect(createServiceClient(() => "https://vrs.test").get("/vrs/recordings")).rejects.toMatchObject({
      code: "ABORTED",
    });
  });
  it("discards a media blob when logout occurs while its body is loading", async () => {
    let owner: string | null = "agent-a";
    const response = new Response("private media");
    vi.spyOn(response, "blob").mockImplementation(async () => {
      owner = null;
      return new Blob(["private media"]);
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response),
    );
    configureApiAuth({
      getAccessToken: () => "token",
      getAgentId: () => owner,
      refresh: async () => true,
      onUnauthorized: () => {},
    });
    await expect(
      createServiceClient(() => "https://vrs.test").get("/vrs/recording/download/1", {}, "blob"),
    ).rejects.toMatchObject({ code: "ABORTED" });
  });
  it("keeps a service 401 local after the identity refresh succeeds", async () => {
    const fetch = vi.fn(async () => new Response('{"message":"VRS session required"}', { status: 401 }));
    vi.stubGlobal("fetch", fetch);
    const endSession = vi.fn(),
      refresh = vi.fn(async () => true);
    configureApiAuth({
      getAccessToken: () => "identity-token",
      getAgentId: () => "agent-a",
      refresh,
      onUnauthorized: endSession,
    });
    await expect(createServiceClient(() => "https://vrs.test").get("/vrs/recordings")).rejects.toMatchObject({
      status: 401,
      message: "VRS session required",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledOnce();
    expect(endSession).not.toHaveBeenCalled();
  });
  it("ends an identity session only when refreshing it fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 401 })),
    );
    const endSession = vi.fn();
    configureApiAuth({
      getAccessToken: () => "expired",
      getAgentId: () => "agent-a",
      refresh: async () => false,
      onUnauthorized: endSession,
    });
    await expect(createServiceClient(() => "https://vrs.test").get("/vrs/recordings")).rejects.toMatchObject({
      status: 401,
    });
    expect(endSession).toHaveBeenCalledOnce();
  });
  it("does not replay an old request under a different identity", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetch);
    let owner = "agent-a";
    const endSession = vi.fn();
    configureApiAuth({
      getAccessToken: () => "token",
      getAgentId: () => owner,
      refresh: async () => {
        owner = "agent-b";
        return true;
      },
      onUnauthorized: endSession,
    });
    await expect(
      createServiceClient(() => "https://vrs.test").put("/vrs/tags/1", { name: "Old user draft" }),
    ).rejects.toMatchObject({ code: "ABORTED" });
    expect(fetch).toHaveBeenCalledOnce();
    expect(endSession).not.toHaveBeenCalled();
  });
});
