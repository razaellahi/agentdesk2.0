import { describe, expect, it } from "vitest";
import { sessionStore, setStorageTenant } from "./storage";

describe("tenant-scoped storage", () => {
  it("isolates keys per tenant and clears only the current tenant", () => {
    setStorageTenant("acme");
    sessionStore.set("draft", { text: "hi" });
    setStorageTenant("globex");
    expect(sessionStore.get("draft")).toBeNull();
    sessionStore.setString("draft", "other");
    sessionStore.clearTenant();
    expect(sessionStore.getString("draft")).toBeNull();
    setStorageTenant("acme");
    expect(sessionStore.get<{ text: string }>("draft")).toEqual({ text: "hi" });
    expect(sessionStorage.getItem("ad2:acme:draft")).toBe('{"text":"hi"}');
  });

  it("returns null for corrupt JSON instead of throwing", () => {
    setStorageTenant("t");
    sessionStorage.setItem("ad2:t:bad", "{oops");
    expect(sessionStore.get("bad")).toBeNull();
  });
});
