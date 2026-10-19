import { describe, expect, it } from "vitest";
import { emptyCall, reduceVoiceEvent, type VoiceEvent, type CallSnapshot } from "./callStore";
const event = (id: string, state: string, name = "dialogstate"): VoiceEvent => ({
  event: name,
  response: { dialog: { id, state, customerNumber: id, participants: [{ mediaAddress: "1001", state }] } },
});
const reduce = (current: CallSnapshot, next: VoiceEvent) =>
  reduceVoiceEvent(current, next, "sip", "1001", 10_000);
describe("provider call events", () => {
  it("keeps consult and customer legs independent, including hold and mute", () => {
    let call = reduce(emptyCall, event("customer", "ACTIVE"));
    call = reduce(call, event("consult", "ALERTING", "consultcall"));
    expect(call.main?.id).toBe("customer");
    expect(call.consult?.phase).toBe("ringing");
    call = reduce(call, event("consult", "ACTIVE"));
    call = reduce(call, event("customer", "HELD"));
    expect(call.phase).toBe("held");
    expect(call.consult?.phase).toBe("active");
    expect(call.main?.startedAt).toBe(10_000);
    call = reduce(call, event("consult", "DROPPED"));
    expect(call.consult).toBeNull();
    expect(call.main?.phase).toBe("held");
  });
  it("promotes a surviving consult leg when the original customer leg ends", () => {
    let call = reduce(emptyCall, event("customer", "ACTIVE"));
    call = reduce(call, event("consult", "ACTIVE", "consultcall"));
    call = reduce(call, event("customer", "DROPPED"));
    expect(call.main?.id).toBe("consult");
    expect(call.consult).toBeNull();
    expect(call.phase).toBe("active");
    call = reduce(call, event("consult", "DROPPED"));
    expect(call.phase).toBe("idle");
    expect(call.recording).toBe("unavailable");
  });
  it("ignores unrelated dialog and recording callbacks", () => {
    const call = reduce(emptyCall, event("customer", "ACTIVE"));
    expect(reduce(call, event("foreign", "ACTIVE"))).toEqual(call);
    expect(
      reduce(call, {
        event: "RECORDING_STATE",
        dialog: { id: "foreign", recording: { recording: "enabled", status: "paused" } },
      }),
    ).toEqual(call);
  });
  it("tracks recording and media events without changing the call phase", () => {
    let call = reduce(emptyCall, event("customer", "ACTIVE"));
    call = reduce(call, {
      event: "RECORDING_STATE",
      dialog: { id: "customer", recording: { recording: "enabled", status: "paused" } },
    });
    expect(call.recording).toBe("paused");
    expect(call.recordingDialogId).toBe("customer");
    call = reduce(call, { event: "mediastreamupdate", dialog: { stream: "video", streamStatus: "on" } });
    expect(call.video).toBe(true);
    expect(call.phase).toBe("active");
    call = reduce(call, {
      event: "mediapermissionstatus",
      dialog: { permissionStatus: "denied", permissionType: "microphone" },
    });
    expect(call.lastError).toContain("permission");
  });
  it("registration follows callbacks and logout clears both legs", () => {
    let call = reduce(emptyCall, { event: "agentinfo", response: { state: "LOGIN" } });
    expect(call.registered).toBe(true);
    call = reduce(call, event("customer", "ACTIVE"));
    call = reduce(call, { event: "agentinfo", response: { state: "LOGOUT" } });
    expect(call).toEqual({ ...emptyCall, stack: "sip" });
  });
});
