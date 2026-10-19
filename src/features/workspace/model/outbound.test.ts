import { describe, expect, it } from "vitest";
import { formatSmsNumber, validSmsNumber } from "./outbound";
describe("prefix-aware outbound SMS", () => {
  it("handles local, international and country-code numbers without duplicating the prefix", () => {
    for (const value of ["03001234567", "3001234567", "+923001234567", "923001234567"])
      expect(formatSmsNumber(value, "+92")).toBe("+923001234567");
    expect(formatSmsNumber("0044 (7700) 900123", "+92")).toBe("+447700900123");
    expect(formatSmsNumber("+44 7700 900123", "+92")).toBe("+447700900123");
    expect(formatSmsNumber("", "+92")).toBe("+92");
    expect(validSmsNumber("+92", "+92")).toBe(false);
    expect(validSmsNumber("*123#", "+92")).toBe(false);
    expect(validSmsNumber("+923001234567", "+92")).toBe(true);
  });
});
