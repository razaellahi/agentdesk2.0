/** Grouped document stored by unified-admin (Backend/src/models/agentDeskSettings.model.js). */
export interface HoldConversationOption {
  label: string;
  value: number;
}

export interface CiscoSettings {
  ssoBackendUrl?: string;
  isGadget?: boolean;
  isSecureLinkEnabled?: boolean;
  boshUrl?: string;
  subBoshUrl?: string;
  callVariable?: string;
  domain?: string;
  subDomain?: string;
  ctiParam?: string;
  ctiParam2?: string;
  finesseFlavor?: "UCCX" | "UCCE" | string;
  ciscoCcMrd?: string;
  finesseURLForAgent?: string;
  isFinesseHaEnabled?: boolean;
  secondaryFinesseUrl?: string;
  ciscoServiceIdentifier?: string;
  webRtcServiceIdentifier?: string;
}

export interface CxVoiceSettings {
  autoCallAnswerTimer?: number;
  sipMonitoringDn?: string;
  sipExternalDn?: string;
  cxVoiceMrd?: string;
  extStatic?: string;
  enableSipLogs?: boolean;
  staticQueueTransferDn?: string;
}

export interface AgentDeskSettingsDoc {
  id: string;
  messagingComposition: {
    isMessageFormattingEnabled: boolean;
    isTextRefineEnabled: boolean;
    isSpellCheckEnabled: boolean;
    isEmojisEnabled: boolean;
    isFileSharingEnabled: boolean;
  };
  knowledgeAiAssistance: {
    isKnowledgeBaseSearchEnabled: boolean;
    knowledgeBaseUrl: string;
  };
  voiceTelephony: {
    isVoicemailEnabled: boolean;
    isCallingComplianceEnabled: boolean;
    isCiscoEnabled: boolean;
    isCxVoiceEnabled: boolean;
    isWebRtcVideoEnabled: boolean;
    webRtcServiceIdentifier?: string;
    ciscoSettings: CiscoSettings;
    cxVoiceSettings: CxVoiceSettings;
  };
  crmIntegration: {
    enableVoiceEventsForCrm: boolean;
    isCrmEventsEnabled: boolean;
  };
  conversationHandling: {
    isAutoAnswerEnabled: boolean;
    autoAnswerDelay: number;
    isWrapUpEnabled: boolean;
    wrapUpTime: number;
    isConversationParticipantsEnabled: boolean;
    isShowActiveChannelsDataEnabled: boolean;
    holdConversation: HoldConversationOption[];
    isInactivityTimerEnabled: boolean;
    inactivityTimeoutSeconds: number;
    isOutboundSmsEnabled: boolean;
    isOutboundSmsSendandClose: boolean;
    prefixCode: string;
  };
  workspacePreferences: {
    dashboardRefreshTime: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Flat, typed runtime view used by the desk (replaces the legacy flattening in
 * unified-agent utils/agent-desk-settings.util.ts + appConfigService.mergeAgentDeskSettings).
 */
export interface DeskSettings {
  id: string;
  // messaging
  messageFormatting: boolean;
  textRefine: boolean;
  spellCheck: boolean;
  emojis: boolean;
  fileSharing: boolean;
  // knowledge
  knowledgeBaseSearch: boolean;
  knowledgeBaseUrl: string;
  // voice
  voicemail: boolean;
  callingCompliance: boolean;
  cisco: boolean;
  cxVoice: boolean;
  webRtcVideo: boolean;
  webRtcServiceIdentifier: string;
  ciscoSettings: CiscoSettings;
  cxVoiceSettings: CxVoiceSettings;
  // crm
  crmEvents: boolean;
  crmVoiceEvents: boolean;
  // conversation handling
  autoAnswer: boolean;
  autoAnswerDelayMs: number;
  wrapUp: boolean;
  wrapUpSeconds: number;
  conversationParticipants: boolean;
  showActiveChannelsData: boolean;
  holdOptions: HoldConversationOption[];
  inactivityTimer: boolean;
  inactivityTimeoutSeconds: number;
  outboundSms: boolean;
  outboundSmsSendAndClose: boolean;
  smsPrefixCode: string;
  // workspace
  dashboardRefreshMs: number;
  secureLink: boolean;
}
