import { describe, expect, it } from "vitest";
import { destinationKey, outboundTargets, planOutbound, type PlanInput } from "./outboundPlan";
import type { ChannelSession } from "./types";

const session = (type: string, identifier: string, extra: Partial<ChannelSession> = {}) =>
  ({
    id: `${type}-1`,
    channel: { channelType: { name: type } },
    channelData: { channelCustomerIdentifier: identifier },
    ...extra,
  }) as ChannelSession;

const base = (patch: Partial<PlanInput> = {}): PlanInput => ({
  customer: { phoneNumber: ["+92 300 1234567"], email: ["amina@example.com"] },
  sessions: [],
  schema: [],
  enabled: { voice: true, sms: true, whatsapp: true, email: true, twitter: true },
  configured: { voice: true, sms: true, whatsapp: true, email: true, twitter: true },
  permitted: true,
  optedOut: false,
  phone: { registered: true, idle: true },
  ...patch,
});

const option = (input: PlanInput, kind: string) => planOutbound(input).options.find((o) => o.kind === kind)!;

describe("outbound plan", () => {
  it("treats differently formatted numbers as one destination", () => {
    expect(destinationKey("sms", "+92 300-1234567")).toBe(destinationKey("sms", "0092300 1234567"));
    const targets = outboundTargets(
      "voice",
      { phoneNumber: ["+92 300-1234567", "0092 300 1234567"], phone: "03001112222" },
      [],
      [],
    );
    expect(targets.map((t) => t.value)).toEqual(["+92 300-1234567", "03001112222"]);
  });

  it("includes schema identifiers of the channel type and live session identifiers", () => {
    const targets = outboundTargets(
      "twitter",
      { handles: ["@amina"] },
      [{ key: "handles", type: "string", isChannelIdentifier: true, channelTypes: ["TWITTER"] }],
      [session("TWITTER", "@amina_support")],
    );
    expect(targets).toEqual([
      { value: "@amina", attrKey: "handles" },
      { value: "@amina_support", attrKey: "twitter" },
    ]);
  });

  it("offers phone numbers for WhatsApp after explicit WhatsApp identifiers", () => {
    const targets = outboundTargets(
      "whatsapp",
      { whatsapp: ["+44 7700 900123"], phoneNumber: ["+92 300 1234567"] },
      [],
      [],
    );
    expect(targets.map((t) => t.value)).toEqual(["+44 7700 900123", "+92 300 1234567"]);
  });

  it("continues a channel the customer is already on instead of starting another conversation", () => {
    const input = base({ sessions: [session("WHATSAPP", "+923001234567")] });
    expect(option(input, "whatsapp")).toMatchObject({ state: "continue", sessionId: "WHATSAPP-1" });
    expect(option(input, "sms").state).toBe("ready");
  });

  it("does not continue on a disabled session", () => {
    const input = base({ sessions: [session("EMAIL", "amina@example.com", { isDisabled: true })] });
    expect(option(input, "email").state).toBe("ready");
  });

  it("blocks every channel for an opted-out customer", () => {
    const plan = planOutbound(base({ optedOut: true, sessions: [session("SMS", "+923001234567")] }));
    expect(plan.optedOut).toBe(true);
    expect(plan.options.every((o) => o.state === "unavailable" && o.reason === "OPT_OUT")).toBe(true);
  });

  it("explains why a channel is unavailable", () => {
    expect(option(base({ permitted: false }), "sms").reason).toBe("NO_PERMISSION");
    expect(option(base({ customer: {} }), "email").reason).toBe("NO_DESTINATION");
    expect(option(base({ configured: { whatsapp: false } }), "whatsapp").reason).toBe("NOT_CONFIGURED");
    expect(option(base({ phone: { registered: false, idle: true } }), "voice").reason).toBe("PHONE_OFFLINE");
    expect(option(base({ phone: { registered: true, idle: false } }), "voice").reason).toBe("ON_CALL");
  });

  it("waits for channel configuration before offering a channel", () => {
    expect(option(base({ configured: {} }), "sms").state).toBe("checking");
  });

  it("only lists channels that are switched on", () => {
    const plan = planOutbound(
      base({ enabled: { voice: false, sms: false, whatsapp: true, email: true, twitter: false } }),
    );
    expect(plan.options.map((o) => o.kind)).toEqual(["whatsapp", "email"]);
  });
});
