import { z } from "zod";
import type { AgentDeskSettingsDoc } from "@/core/agent-settings";
import { CISCO_DEFAULTS, CX_VOICE_DEFAULTS } from "./fields";

type T = (key: string, params?: Record<string, unknown>) => string;

const int = (t: T) =>
  z.number({ error: t("admin-settings.errors.number") }).int(t("admin-settings.errors.number"));

/** Form schema with the same rules as unified-admin AgentDeskSettingsComponent. */
export function settingsSchema(t: T) {
  return z
    .object({
      messagingComposition: z.object({
        isMessageFormattingEnabled: z.boolean(),
        isTextRefineEnabled: z.boolean(),
        isSpellCheckEnabled: z.boolean(),
        isEmojisEnabled: z.boolean(),
        isFileSharingEnabled: z.boolean(),
      }),
      knowledgeAiAssistance: z.object({
        isKnowledgeBaseSearchEnabled: z.boolean(),
        knowledgeBaseUrl: z.string(),
      }),
      voiceTelephony: z.object({
        isVoicemailEnabled: z.boolean(),
        isCallingComplianceEnabled: z.boolean(),
        isCiscoEnabled: z.boolean(),
        isCxVoiceEnabled: z.boolean(),
        isWebRtcVideoEnabled: z.boolean(),
        ciscoSettings: z.object({
          ssoBackendUrl: z.string(),
          isGadget: z.boolean(),
          isSecureLinkEnabled: z.boolean(),
          boshUrl: z.string(),
          subBoshUrl: z.string(),
          callVariable: z.string(),
          domain: z.string(),
          subDomain: z.string(),
          ctiParam: z.string(),
          ctiParam2: z.string(),
          finesseFlavor: z.string(),
          ciscoCcMrd: z.string(),
          finesseURLForAgent: z.string(),
          isFinesseHaEnabled: z.boolean(),
          secondaryFinesseUrl: z.string(),
          ciscoServiceIdentifier: z.string(),
          webRtcServiceIdentifier: z.string(),
        }),
        cxVoiceSettings: z.object({
          autoCallAnswerTimer: int(t).min(0, t("admin-settings.errors.min", { min: 0 })),
          sipMonitoringDn: z.string(),
          sipExternalDn: z.string(),
          cxVoiceMrd: z.string(),
          extStatic: z.string(),
          enableSipLogs: z.boolean(),
          staticQueueTransferDn: z.string(),
        }),
      }),
      crmIntegration: z.object({
        enableVoiceEventsForCrm: z.boolean(),
        isCrmEventsEnabled: z.boolean(),
      }),
      conversationHandling: z.object({
        isAutoAnswerEnabled: z.boolean(),
        autoAnswerDelay: int(t).min(0, t("admin-settings.errors.min", { min: 0 })),
        isWrapUpEnabled: z.boolean(),
        wrapUpTime: z.number(),
        isConversationParticipantsEnabled: z.boolean(),
        isShowActiveChannelsDataEnabled: z.boolean(),
        holdConversation: z.array(z.number()).min(1, t("admin-settings.errors.hold-required")),
        isInactivityTimerEnabled: z.boolean(),
        inactivityTimeoutSeconds: z.number(),
        isOutboundSmsEnabled: z.boolean(),
        isOutboundSmsSendandClose: z.boolean(),
        prefixCode: z
          .string()
          .max(4, t("admin-settings.errors.prefix"))
          .regex(/^(?:[+0]?[1-9]{1,3})?$/, t("admin-settings.errors.prefix")),
      }),
      workspacePreferences: z.object({
        dashboardRefreshTime: int(t).min(1000, t("admin-settings.errors.min", { min: 1000 })),
      }),
    })
    .superRefine((v, ctx) => {
      const ch = v.conversationHandling;
      if (
        v.knowledgeAiAssistance.isKnowledgeBaseSearchEnabled &&
        !v.knowledgeAiAssistance.knowledgeBaseUrl.trim()
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["knowledgeAiAssistance", "knowledgeBaseUrl"],
          message: t("admin-settings.errors.kb-url"),
        });
      }
      if (
        ch.isWrapUpEnabled &&
        (!Number.isInteger(ch.wrapUpTime) || ch.wrapUpTime < 15 || ch.wrapUpTime > 1800)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["conversationHandling", "wrapUpTime"],
          message: t("admin-settings.errors.range", { min: 15, max: 1800 }),
        });
      }
      if (
        ch.isInactivityTimerEnabled &&
        (!Number.isInteger(ch.inactivityTimeoutSeconds) ||
          ch.inactivityTimeoutSeconds < 30 ||
          ch.inactivityTimeoutSeconds > 3600)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["conversationHandling", "inactivityTimeoutSeconds"],
          message: t("admin-settings.errors.range", { min: 30, max: 3600 }),
        });
      }
    });
}

export type SettingsForm = z.infer<ReturnType<typeof settingsSchema>>;

const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : Number(v) || fallback;
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : v == null ? fallback : String(v));

/**
 * Stored document -> form values. Mirrors normalizeGroupedSettings: legacy
 * locations (auto-answer under voiceTelephony, webRtcServiceIdentifier at group
 * level) are folded into their current place, and missing groups get defaults.
 */
export function toForm(doc: Partial<AgentDeskSettingsDoc> & Record<string, unknown>): SettingsForm {
  const m = doc.messagingComposition ?? ({} as Partial<AgentDeskSettingsDoc["messagingComposition"]>);
  const k = doc.knowledgeAiAssistance ?? ({} as Partial<AgentDeskSettingsDoc["knowledgeAiAssistance"]>);
  const v = (doc.voiceTelephony ?? {}) as Partial<AgentDeskSettingsDoc["voiceTelephony"]> &
    Record<string, unknown>;
  const c = doc.crmIntegration ?? ({} as Partial<AgentDeskSettingsDoc["crmIntegration"]>);
  const h = doc.conversationHandling ?? ({} as Partial<AgentDeskSettingsDoc["conversationHandling"]>);
  const w = doc.workspacePreferences ?? ({} as Partial<AgentDeskSettingsDoc["workspacePreferences"]>);
  const cisco = { ...CISCO_DEFAULTS, ...(v.ciscoSettings ?? {}) } as Record<string, unknown>;
  const cx = { ...CX_VOICE_DEFAULTS, ...(v.cxVoiceSettings ?? {}) } as Record<string, unknown>;

  let isCisco = bool(v.isCiscoEnabled, false);
  const isCx = bool(v.isCxVoiceEnabled, true);
  if (isCisco && isCx) isCisco = false; // CX Voice wins, as in syncVoiceControls.

  return {
    messagingComposition: {
      isMessageFormattingEnabled: bool(m.isMessageFormattingEnabled, false),
      isTextRefineEnabled: bool(m.isTextRefineEnabled, false),
      isSpellCheckEnabled: bool(m.isSpellCheckEnabled, true),
      isEmojisEnabled: bool(m.isEmojisEnabled, false),
      isFileSharingEnabled: bool(m.isFileSharingEnabled, false),
    },
    knowledgeAiAssistance: {
      isKnowledgeBaseSearchEnabled: bool(k.isKnowledgeBaseSearchEnabled, false),
      knowledgeBaseUrl: str(k.knowledgeBaseUrl),
    },
    voiceTelephony: {
      isVoicemailEnabled: bool(v.isVoicemailEnabled, false),
      isCallingComplianceEnabled: bool(v.isCallingComplianceEnabled, false),
      isCiscoEnabled: isCisco,
      isCxVoiceEnabled: isCx,
      isWebRtcVideoEnabled: bool(v.isWebRtcVideoEnabled, false),
      ciscoSettings: {
        ssoBackendUrl: str(cisco.ssoBackendUrl),
        isGadget: bool(cisco.isGadget, true),
        isSecureLinkEnabled: bool(cisco.isSecureLinkEnabled, false),
        boshUrl: str(cisco.boshUrl),
        subBoshUrl: str(cisco.subBoshUrl),
        callVariable: str(cisco.callVariable),
        domain: str(cisco.domain),
        subDomain: str(cisco.subDomain),
        ctiParam: str(cisco.ctiParam),
        ctiParam2: str(cisco.ctiParam2),
        finesseFlavor: str(cisco.finesseFlavor, "UCCX"),
        ciscoCcMrd: str(cisco.ciscoCcMrd),
        finesseURLForAgent: str(cisco.finesseURLForAgent),
        isFinesseHaEnabled: bool(cisco.isFinesseHaEnabled, false),
        secondaryFinesseUrl: str(cisco.secondaryFinesseUrl),
        ciscoServiceIdentifier: str(cisco.ciscoServiceIdentifier),
        webRtcServiceIdentifier: str(
          (v.ciscoSettings as Record<string, unknown> | undefined)?.webRtcServiceIdentifier ??
            v.webRtcServiceIdentifier ??
            CISCO_DEFAULTS.webRtcServiceIdentifier,
        ),
      },
      cxVoiceSettings: {
        autoCallAnswerTimer: num(cx.autoCallAnswerTimer, 2),
        sipMonitoringDn: str(cx.sipMonitoringDn),
        sipExternalDn: str(cx.sipExternalDn),
        cxVoiceMrd: str(cx.cxVoiceMrd),
        extStatic: str(cx.extStatic),
        enableSipLogs: bool(cx.enableSipLogs, false),
        staticQueueTransferDn: str(cx.staticQueueTransferDn),
      },
    },
    crmIntegration: {
      // Voice events need a voice provider (syncVoiceEventsControl).
      enableVoiceEventsForCrm: (isCisco || isCx) && bool(c.enableVoiceEventsForCrm, false),
      isCrmEventsEnabled: bool(c.isCrmEventsEnabled, false),
    },
    conversationHandling: {
      isAutoAnswerEnabled: bool(h.isAutoAnswerEnabled ?? v.isAutoAnswerEnabled, false),
      autoAnswerDelay: num(h.autoAnswerDelay ?? v.autoAnswerDelay, 5000),
      isWrapUpEnabled: bool(h.isWrapUpEnabled, false),
      wrapUpTime: num(h.wrapUpTime, 60),
      isConversationParticipantsEnabled: bool(h.isConversationParticipantsEnabled, false),
      isShowActiveChannelsDataEnabled: bool(h.isShowActiveChannelsDataEnabled, false),
      holdConversation: (Array.isArray(h.holdConversation) ? h.holdConversation : [])
        .map((o) => (typeof o === "number" ? o : (o as { value?: number })?.value))
        .filter((n): n is number => typeof n === "number")
        .sort((a, b) => a - b),
      isInactivityTimerEnabled: bool(h.isInactivityTimerEnabled, false),
      inactivityTimeoutSeconds: num(h.inactivityTimeoutSeconds, 100),
      isOutboundSmsEnabled: bool(h.isOutboundSmsEnabled, false),
      isOutboundSmsSendandClose: bool(h.isOutboundSmsSendandClose, false),
      prefixCode: str(h.prefixCode, "+1"),
    },
    workspacePreferences: {
      dashboardRefreshTime: num(w.dashboardRefreshTime, 10000),
    },
  };
}

const minutesLabel = (n: number) => `${n} ${n === 1 ? "Minute" : "Minutes"}`;

/** Form values -> PUT body (unified-admin buildGroupedPayload + exclusivity rule). */
export function toPayload(values: SettingsForm, id: string): AgentDeskSettingsDoc {
  const voice = { ...values.voiceTelephony };
  if (voice.isCxVoiceEnabled) voice.isCiscoEnabled = false;
  else if (voice.isCiscoEnabled) voice.isCxVoiceEnabled = false;
  const hasVoice = voice.isCiscoEnabled || voice.isCxVoiceEnabled;

  return {
    id,
    messagingComposition: values.messagingComposition,
    knowledgeAiAssistance: values.knowledgeAiAssistance,
    voiceTelephony: voice,
    crmIntegration: {
      ...values.crmIntegration,
      enableVoiceEventsForCrm: hasVoice && values.crmIntegration.enableVoiceEventsForCrm,
    },
    conversationHandling: {
      ...values.conversationHandling,
      // Stored labels stay English: they are what the agent app has always shown.
      holdConversation: values.conversationHandling.holdConversation.map((value) => ({
        label: minutesLabel(value),
        value,
      })),
    },
    workspacePreferences: values.workspacePreferences,
  };
}
