import { describe, expect, it } from "vitest";
import { channelLook, channelTypeNames } from "./channelIcons";

describe("channel types of a customer attribute", () => {
  it("reads names or { name } objects, once each", () => {
    expect(channelTypeNames(["SMS", "WHATSAPP", "SMS"])).toEqual(["SMS", "WHATSAPP"]);
    expect(channelTypeNames([{ name: "CX_VOICE" }, { name: "CISCO_CC" }])).toEqual(["CX_VOICE", "CISCO_CC"]);
    expect(channelTypeNames(undefined)).toEqual([]);
  });

  it("draws each voice, web and phone channel with its own mark", () => {
    const icon = (name: string) => (channelLook(name) as { Icon?: unknown }).Icon;
    expect(icon("CX_VOICE")).toBe(icon("CISCO_CC"));
    expect(icon("WEB")).not.toBe(icon("WEB_RTC"));
    expect(icon("SMS")).not.toBe(icon("CX_VOICE"));
    expect(channelLook("WHATSAPP").kind).toBe("brand");
  });
});
