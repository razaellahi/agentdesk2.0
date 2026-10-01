import type { CiscoSettings, CxVoiceSettings } from "@/core/agent-settings";

/**
 * Metadata-driven Cisco / CX Voice fields (unified-admin ciscoConfigFields /
 * cxVoiceConfigFields). Labels and help text come from
 * admin-settings.cisco.<name> / admin-settings.cx.<name> translation keys.
 */
export interface ConfigField<K extends string> {
  name: K;
  type: "text" | "boolean" | "select" | "secret" | "number";
  options?: string[];
  /** Platform-managed value: always read-only. */
  static?: boolean;
}

export const CISCO_FIELDS: ConfigField<keyof CiscoSettings>[] = [
  { name: "ssoBackendUrl", type: "text" },
  { name: "isGadget", type: "boolean" },
  { name: "isSecureLinkEnabled", type: "boolean" },
  { name: "boshUrl", type: "text" },
  { name: "subBoshUrl", type: "text" },
  { name: "callVariable", type: "text" },
  { name: "domain", type: "text" },
  { name: "subDomain", type: "text" },
  { name: "ctiParam", type: "secret" },
  { name: "ctiParam2", type: "secret" },
  { name: "finesseFlavor", type: "select", options: ["UCCX", "UCCE"] },
  { name: "ciscoCcMrd", type: "text", static: true },
  { name: "finesseURLForAgent", type: "text" },
  { name: "isFinesseHaEnabled", type: "boolean" },
  { name: "secondaryFinesseUrl", type: "text" },
  { name: "ciscoServiceIdentifier", type: "text" },
  { name: "webRtcServiceIdentifier", type: "text" },
];

export const CX_VOICE_FIELDS: ConfigField<keyof CxVoiceSettings>[] = [
  { name: "autoCallAnswerTimer", type: "number" },
  { name: "sipMonitoringDn", type: "text", static: true },
  { name: "sipExternalDn", type: "text", static: true },
  { name: "cxVoiceMrd", type: "text", static: true },
  { name: "extStatic", type: "secret" },
  { name: "enableSipLogs", type: "boolean" },
  { name: "staticQueueTransferDn", type: "text", static: true },
];

/** Defaults used when a stored document lacks a group (same as the backend model). */
export const CISCO_DEFAULTS: Required<CiscoSettings> = {
  ssoBackendUrl: "https://192.168.1.104:1123/",
  isGadget: true,
  isSecureLinkEnabled: false,
  boshUrl: "https://finesse12.ucce.ipcc:7443/http-bind/",
  subBoshUrl: "https://finesse.ucce.ipcc:7443/http-bind/",
  callVariable: "callVariable1",
  domain: "finesse12.ucce.ipcc",
  subDomain: "finesse12.ucce.ipcc",
  ctiParam: "",
  ctiParam2: "",
  finesseFlavor: "UCCX",
  ciscoCcMrd: "20316843be924c8ab4f57a7a",
  finesseURLForAgent: "https://122.129.75.138:8445",
  isFinesseHaEnabled: false,
  secondaryFinesseUrl: "https://finesse12-5.ucce.ipcc:8445",
  ciscoServiceIdentifier: "0000",
  webRtcServiceIdentifier: "00000",
};

export const CX_VOICE_DEFAULTS: Required<CxVoiceSettings> = {
  autoCallAnswerTimer: 2,
  sipMonitoringDn: "*44",
  sipExternalDn: "99887765",
  cxVoiceMrd: "62f9e360ea5311eda05b0242",
  extStatic: "",
  enableSipLogs: false,
  staticQueueTransferDn: "99887766",
};

/** Hold durations agents can pick when pausing a chat: 1–20 minutes. */
export const HOLD_SPANS = Array.from({ length: 20 }, (_, i) => i + 1);
