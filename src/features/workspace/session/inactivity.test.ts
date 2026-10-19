import { describe, expect, it } from "vitest";
import { inactivityTick } from "./inactivity";

describe("inactivityTick", () => {
  const timeout = 100_000;

  it("stays quiet before 80% of the timeout", () => {
    expect(inactivityTick(79_000, timeout)).toEqual({ logout: false, warnSeconds: 0 });
  });

  it("warns with the remaining seconds after 80%", () => {
    expect(inactivityTick(90_000, timeout)).toEqual({ logout: false, warnSeconds: 10 });
  });

  it("logs out once the timeout is reached", () => {
    expect(inactivityTick(100_000, timeout).logout).toBe(true);
  });
});
