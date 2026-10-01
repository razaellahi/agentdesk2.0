import { describe, expect, it } from "vitest";
import { resolveDeskSettings } from "./resolve";

describe("resolveDeskSettings", () => {
  it("flattens grouped settings", () => {
    const s = resolveDeskSettings({
      id: "1",
      messagingComposition: { isSpellCheckEnabled: false, isEmojisEnabled: true },
      voiceTelephony: {
        isCxVoiceEnabled: true,
        ciscoSettings: { webRtcServiceIdentifier: "777", isSecureLinkEnabled: true },
      },
      conversationHandling: {
        isWrapUpEnabled: true,
        wrapUpTime: 90,
        holdConversation: [{ label: "1 Minute", value: 1 }],
      },
    });
    expect(s.spellCheck).toBe(false);
    expect(s.emojis).toBe(true);
    expect(s.cxVoice).toBe(true);
    expect(s.webRtcServiceIdentifier).toBe("777");
    expect(s.secureLink).toBe(true);
    expect(s.wrapUp).toBe(true);
    expect(s.wrapUpSeconds).toBe(90);
    expect(s.holdOptions).toEqual([{ label: "1 Minute", value: 1 }]);
  });

  it("uses model defaults and config fallbacks for missing groups", () => {
    const s = resolveDeskSettings(
      { id: "x" },
      { isCallingComplianceEnabled: true, DASHBOARD_REFRESH_TIME: 5000 },
    );
    expect(s.spellCheck).toBe(true);
    expect(s.autoAnswerDelayMs).toBe(5000);
    expect(s.inactivityTimeoutSeconds).toBe(100);
    expect(s.smsPrefixCode).toBe("+1");
    expect(s.callingCompliance).toBe(true);
    expect(s.dashboardRefreshMs).toBe(5000);
  });

  it("accepts legacy numeric hold options", () => {
    const s = resolveDeskSettings({ id: "x", conversationHandling: { holdConversation: [5 as never] } });
    expect(s.holdOptions).toEqual([{ label: "5 Minutes", value: 5 }]);
  });
});
