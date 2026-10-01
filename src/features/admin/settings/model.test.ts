import { describe, expect, it } from "vitest";
import { MOCK_DESK_SETTINGS } from "@/test/msw/data";
import { settingsSchema, toForm, toPayload } from "./model";

const t = (key: string) => key;

describe("settings model", () => {
  it("round-trips a stored document", () => {
    const form = toForm(MOCK_DESK_SETTINGS as never);
    const payload = toPayload(form, MOCK_DESK_SETTINGS.id);
    expect(payload.id).toBe("ads-1");
    expect(payload.conversationHandling.holdConversation).toEqual(
      MOCK_DESK_SETTINGS.conversationHandling.holdConversation,
    );
    expect(payload.voiceTelephony.isCxVoiceEnabled).toBe(true);
    expect(payload.voiceTelephony.isCiscoEnabled).toBe(false);
  });

  it("folds legacy auto-answer fields and webRtcServiceIdentifier into their current place", () => {
    const form = toForm({
      id: "x",
      voiceTelephony: { isAutoAnswerEnabled: true, autoAnswerDelay: 3000, webRtcServiceIdentifier: "555" },
    } as never);
    expect(form.conversationHandling.isAutoAnswerEnabled).toBe(true);
    expect(form.conversationHandling.autoAnswerDelay).toBe(3000);
    expect(form.voiceTelephony.ciscoSettings.webRtcServiceIdentifier).toBe("555");
  });

  it("never sends Cisco and CX Voice both enabled, and drops voice CRM events without voice", () => {
    const form = toForm(MOCK_DESK_SETTINGS as never);
    form.voiceTelephony.isCiscoEnabled = true;
    form.voiceTelephony.isCxVoiceEnabled = true;
    expect(toPayload(form, "x").voiceTelephony.isCiscoEnabled).toBe(false);
    form.voiceTelephony.isCiscoEnabled = false;
    form.voiceTelephony.isCxVoiceEnabled = false;
    form.crmIntegration.enableVoiceEventsForCrm = true;
    expect(toPayload(form, "x").crmIntegration.enableVoiceEventsForCrm).toBe(false);
  });

  it("validates conditional ranges like unified-admin", () => {
    const schema = settingsSchema(t);
    const form = toForm(MOCK_DESK_SETTINGS as never);
    expect(schema.safeParse(form).success).toBe(true);

    const bad = structuredClone(form);
    bad.conversationHandling.wrapUpTime = 10;
    bad.conversationHandling.isInactivityTimerEnabled = true;
    bad.conversationHandling.inactivityTimeoutSeconds = 5000;
    bad.knowledgeAiAssistance.knowledgeBaseUrl = "";
    bad.conversationHandling.holdConversation = [];
    bad.conversationHandling.prefixCode = "+12345";
    const paths = schema.safeParse(bad).error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(
      expect.arrayContaining([
        "conversationHandling.wrapUpTime",
        "conversationHandling.inactivityTimeoutSeconds",
        "knowledgeAiAssistance.knowledgeBaseUrl",
        "conversationHandling.holdConversation",
        "conversationHandling.prefixCode",
      ]),
    );
  });

  it("ignores wrap-up time when wrap-up is off", () => {
    const form = toForm(MOCK_DESK_SETTINGS as never);
    form.conversationHandling.isWrapUpEnabled = false;
    form.conversationHandling.wrapUpTime = 1;
    expect(settingsSchema(t).safeParse(form).success).toBe(true);
  });
});
