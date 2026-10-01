import { describe, expect, it } from "vitest";
import { redact } from "./logger";

describe("redact", () => {
  it("masks credential-like fields at any depth", () => {
    expect(
      redact({ username: "a", password: "p", nested: { refresh_token: "r", ctiParam2: "x", ok: 1 } }),
    ).toEqual({
      username: "a",
      password: "[redacted]",
      nested: { refresh_token: "[redacted]", ctiParam2: "[redacted]", ok: 1 },
    });
  });
});
