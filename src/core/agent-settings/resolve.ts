import type { AgentDeskSettingsDoc, DeskSettings } from "./types";

type Partialish<T> = { [K in keyof T]?: T[K] extends object ? Partialish<T[K]> : T[K] };

/** Same defaults as the unified-admin model, used when a group or field is missing. */
export function resolveDeskSettings(
  raw: Partialish<AgentDeskSettingsDoc>,
  fallbacks: { isCallingComplianceEnabled?: boolean; DASHBOARD_REFRESH_TIME?: number } = {},
): DeskSettings {
  const m = raw.messagingComposition ?? {};
  const k = raw.knowledgeAiAssistance ?? {};
  const v = raw.voiceTelephony ?? {};
  const c = raw.crmIntegration ?? {};
  const h = raw.conversationHandling ?? {};
  const w = raw.workspacePreferences ?? {};
  const cisco = (v.ciscoSettings ?? {}) as DeskSettings["ciscoSettings"];
  const cx = (v.cxVoiceSettings ?? {}) as DeskSettings["cxVoiceSettings"];

  const holdOptions = Array.isArray(h.holdConversation)
    ? (h.holdConversation as unknown[])
        .map((o) =>
          typeof o === "number"
            ? { label: `${o} Minutes`, value: o }
            : (o as { label?: string; value?: number }),
        )
        .filter((o): o is { label: string; value: number } => typeof o?.value === "number")
        .map((o) => ({ label: o.label ?? `${o.value} Minutes`, value: o.value }))
    : [];

  return {
    id: String(raw.id ?? (raw as { _id?: string })._id ?? ""),
    messageFormatting: m.isMessageFormattingEnabled ?? false,
    textRefine: m.isTextRefineEnabled ?? false,
    spellCheck: m.isSpellCheckEnabled ?? true,
    emojis: m.isEmojisEnabled ?? false,
    fileSharing: m.isFileSharingEnabled ?? false,
    knowledgeBaseSearch: k.isKnowledgeBaseSearchEnabled ?? false,
    knowledgeBaseUrl: k.knowledgeBaseUrl ?? "",
    voicemail: v.isVoicemailEnabled ?? false,
    callingCompliance: v.isCallingComplianceEnabled ?? fallbacks.isCallingComplianceEnabled ?? false,
    cisco: v.isCiscoEnabled ?? false,
    cxVoice: v.isCxVoiceEnabled ?? false,
    webRtcVideo: v.isWebRtcVideoEnabled ?? false,
    webRtcServiceIdentifier: cisco.webRtcServiceIdentifier ?? v.webRtcServiceIdentifier ?? "",
    ciscoSettings: cisco,
    cxVoiceSettings: cx,
    crmEvents: c.isCrmEventsEnabled ?? false,
    crmVoiceEvents: c.enableVoiceEventsForCrm ?? false,
    autoAnswer: h.isAutoAnswerEnabled ?? false,
    autoAnswerDelayMs: h.autoAnswerDelay ?? 5000,
    wrapUp: h.isWrapUpEnabled ?? false,
    wrapUpSeconds: h.wrapUpTime ?? 60,
    conversationParticipants: h.isConversationParticipantsEnabled ?? false,
    showActiveChannelsData: h.isShowActiveChannelsDataEnabled ?? false,
    holdOptions,
    inactivityTimer: h.isInactivityTimerEnabled ?? false,
    inactivityTimeoutSeconds: h.inactivityTimeoutSeconds ?? 100,
    outboundSms: h.isOutboundSmsEnabled ?? false,
    outboundSmsSendAndClose: h.isOutboundSmsSendandClose ?? false,
    smsPrefixCode: h.prefixCode ?? "+1",
    dashboardRefreshMs: w.dashboardRefreshTime ?? fallbacks.DASHBOARD_REFRESH_TIME ?? 10000,
    secureLink: cisco.isSecureLinkEnabled ?? false,
  };
}
