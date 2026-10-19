import { describe, expect, it } from "vitest";
import { buildVoiceCommand } from "./commands";
describe("provider command contracts", () => {
  it("uses CX queue commands and the configured transfer DN", () => {
    expect(
      buildVoiceCommand(
        "consult",
        { dialogId: "call-1", number: "queue-1", destinationType: "queue", queueDn: "*55" },
        "sip",
      ),
    ).toEqual({
      action: "makeConsultQueue",
      parameter: { dialogId: "call-1", queue: "queue-1", queueType: "ID", numberToTransfer: "*55" },
    });
    expect(
      buildVoiceCommand(
        "transfer",
        { dialogId: "call-1", number: "queue-1", destinationType: "queue", queueDn: "*55" },
        "sip",
      ).action,
    ).toBe("SST_Queue");
    expect(() => buildVoiceCommand("consult", { number: "q", destinationType: "queue" }, "sip")).toThrow(
      "Queue transfer DN",
    );
  });
  it("applies external dialing only to CX external destinations", () => {
    expect(
      buildVoiceCommand(
        "transfer",
        { dialogId: "c1", number: "123", destinationType: "external", externalDn: "*88" },
        "sip",
      ).parameter,
    ).toEqual({ dialogId: "c1", numberToTransfer: "*88-123" });
    expect(buildVoiceCommand("transfer", { dialogId: "c1", number: "1002" }, "finesse").parameter).toEqual({
      dialogId: "c1",
      numberToTransfer: "1002",
    });
    expect(() => buildVoiceCommand("video", {}, "finesse")).toThrow("unavailable for Cisco");
  });
});
