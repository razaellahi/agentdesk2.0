import { toast } from "sonner";
import { getConfig } from "@/config";
import { getDeskSettings } from "@/core/agent-settings";
import { cxTenantApi } from "@/core/api";
import { getSession, onAfterLogin, useSessionStore, can, type LoginMethod } from "@/core/auth";
import { socketManager } from "@/core/realtime";
import { t } from "@/core/i18n";
import { restoreVoiceMrd, forgetVoiceMrd, useAgentStore } from "@/features/workspace";
import { reduceVoiceEvent, useCallStore, type VoiceEvent } from "./callStore";
import { publishVoiceTransition, resetCallLegs } from "./callLegs";
import { loadFinesseScripts, loadSipScripts, postFinesse, postSip } from "./scripts";

let voicePassword = "";
let finesseSso = false;
let finesseState = "";
let generation = 0;
export interface VoiceConnection {
  domain: string;
  extension: string;
  wss: string;
  eslHost: string;
  voiceConnectorUrl: string;
}
let connection: VoiceConnection | null = null;
export function getVoiceConnection() {
  return connection;
}
useSessionStore.subscribe((s, prev) => {
  if (prev.user?.id !== s.user?.id) {
    voicePassword = "";
    finesseSso = false;
    finesseState = "";
    connection = null;
    generation++;
    resetCallLegs();
    forgetVoiceMrd();
    useCallStore.getState().reset();
  }
});
export function voiceCallback(stack: "sip" | "finesse", version = generation) {
  const userId = getSession().user?.id;
  return (event: VoiceEvent) => {
    if (version !== generation || getSession().user?.id !== userId || !userId) return;
    const before = useCallStore.getState();
    const after = reduceVoiceEvent(before, event, stack, extensionOf());
    useCallStore.getState().patch(after);
    if (stack === "finesse" && ["agentstate", "agentinfo"].includes(event.event?.toLowerCase() ?? "")) {
      const state = event.response?.state?.toUpperCase() ?? "";
      finesseState = state;
      const presence = useAgentStore.getState().presence;
      const mrd = presence?.agentMrdStates.find(
        (item) => item.mrd.id === getDeskSettings().ciscoSettings.ciscoCcMrd || /cisco/i.test(item.mrd.name),
      );
      if (
        mrd &&
        ["READY", "NOT_READY", "TALKING"].includes(state) &&
        mrd.state !== (state === "TALKING" ? "BUSY" : state)
      ) {
        if (state === "READY" && presence?.state.name !== "READY")
          socketManager.emit("changeAgentState", {
            agentId: userId,
            action: "agentState",
            state: { name: "READY", reasonCode: null },
          });
        socketManager.emit("changeAgentState", {
          agentId: userId,
          action: "agentMRDState",
          state: state === "TALKING" ? "BUSY" : state,
          mrdId: mrd.mrd.id,
        });
      }
    }
    if (before.phase !== "idle" && after.phase === "idle") restoreVoiceMrd();
    void publishVoiceTransition(before, after, event, stack).catch((error: Error) => {
      if (version === generation)
        useCallStore.getState().patch({ lastError: `Call history update failed: ${error.message}` });
    });
  };
}

let finessePresenceSubscription: (() => void) | null = null;
function bindFinessePresence() {
  finessePresenceSubscription?.();
  // Synchronize Cisco readiness from authoritative agent-manager presence updates.
  finessePresenceSubscription = useAgentStore.subscribe((state, previous) => {
    const call = useCallStore.getState();
    if (
      state.presence === previous.presence ||
      call.stack !== "finesse" ||
      !call.registered ||
      !getSession().user
    )
      return;
    const mrd = state.presence?.agentMrdStates.find(
      (item) => item.mrd.id === getDeskSettings().ciscoSettings.ciscoCcMrd || /cisco/i.test(item.mrd.name),
    );
    if (!mrd) return;
    try {
      if (mrd.state === "READY" && !["READY", "RESERVED"].includes(finesseState))
        postFinesse({ action: "makeReady" });
      if (
        ["NOT_READY", "INTERRUPTED", "PENDING_NOT_READY"].includes(mrd.state) &&
        finesseState !== "NOT_READY"
      )
        postFinesse({ action: "makeNotReadyWithReason", parameter: { userId: getSession().user?.username } });
    } catch (error) {
      useCallStore.getState().patch({ lastError: (error as Error).message });
    }
  });
}

/** The login password, kept in memory for the CTI wrappers. Never written to storage. */
export function rememberVoicePassword(method: LoginMethod, password?: string) {
  if (password) voicePassword = password;
  void method;
}

export function getVoicePassword() {
  return voicePassword;
}

onAfterLogin((method, credentials) => {
  finesseSso = method === "finesse" && credentials.authWithSSO === true;
  rememberVoicePassword(method, finesseSso ? credentials.authToken : credentials.password);
});

function extensionOf() {
  const value = getSession().user?.attributes?.agentExtension;
  return Array.isArray(value) ? value[0] : undefined;
}

function domainOf() {
  const root = getConfig().ROOT_DOMAIN;
  const host = globalThis.location.hostname;
  if (root && host.endsWith(root)) return host.split(".")[0] || getConfig().SIP_URI;
  return getConfig().SIP_URI || root;
}

interface TenantRow {
  tenantId?: string;
  tenantSettings?: { mediaServer?: { wssUrl?: string; voiceConnectorUrl?: string } };
}

export async function startCxVoice() {
  if (!can("agentSession")) return;
  const version = ++generation;
  const config = getConfig();
  await loadSipScripts();
  if (version !== generation) return;
  let wss = config.SIP_SOCKET_URL;
  let voiceConnectorUrl = "";
  try {
    const tenants = await cxTenantApi.get<TenantRow[]>("/tenant");
    const match = (Array.isArray(tenants) ? tenants : []).find((row) => row.tenantId === domainOf());
    wss = match?.tenantSettings?.mediaServer?.wssUrl || wss;
    voiceConnectorUrl = match?.tenantSettings?.mediaServer?.voiceConnectorUrl ?? "";
  } catch {
    /* fall back to SIP_SOCKET_URL */
  }
  if (version !== generation) return;
  window.sipConfig = {
    ...(window.sipConfig ?? {}),
    wss,
    uri: config.SIP_URI || domainOf(),
    agentStaticPassword: getDeskSettings().cxVoiceSettings.extStatic || config.EXT_STATIC || voicePassword,
    enable_sip_log: getDeskSettings().cxVoiceSettings.enableSipLogs ?? config.ENABLE_SIP_LOGS,
    monitoringDn: getDeskSettings().cxVoiceSettings.sipMonitoringDn || config.SIP_MONITORING_DN,
    staticExternalDn: getDeskSettings().cxVoiceSettings.sipExternalDn,
    staticQueueTransferDn: getDeskSettings().cxVoiceSettings.staticQueueTransferDn,
  };
  const extension = extensionOf();
  if (!extension) {
    toast.error(t("snackbar.No-Extension-Found"));
    return;
  }
  const eslHost = wss ? new URL(wss.replace(/^wss:/, "https:").replace(/^ws:/, "http:")).hostname : "";
  connection = {
    domain: domainOf(),
    extension,
    wss,
    eslHost,
    voiceConnectorUrl: voiceConnectorUrl || (eslHost ? `http://${eslHost}` : ""),
  };
  useCallStore.getState().patch({ stack: "sip" });
  postSip({
    action: "login",
    parameter: {
      loginId: getSession().user?.username,
      password: voicePassword,
      extension,
      domain: domainOf(),
      wssUrl: wss,
      clientCallbackFunction: voiceCallback("sip", version),
    },
  });
}

export function stopVoice() {
  finessePresenceSubscription?.();
  finessePresenceSubscription = null;
  const stack = useCallStore.getState().stack;
  const version = generation;
  generation++;
  resetCallLegs();
  forgetVoiceMrd();
  if (stack === "sip" && window.postMessages)
    postSip({ action: "logout", parameter: { clientCallbackFunction: voiceCallback("sip", version) } });
  if (stack === "finesse" && window.executeCommands) postFinesse({ action: "logout", parameter: {} });
  connection = null;
  useCallStore.getState().reset();
}
export const stopCxVoice = stopVoice;

export async function startFinesse(boshUrl: string, domain: string, flavor: string) {
  if (!can("agentSession")) return;
  const version = ++generation;
  await loadFinesseScripts(
    () => {
      if (version === generation)
        window.config = { ...(window.config ?? {}), boshUrl, domain, finesseFlavor: flavor };
    },
    () => {
      if (version === generation)
        postFinesse({
          action: "registerCallback",
          parameter: { callbackFunction: voiceCallback("finesse", version) },
        });
    },
  );
  if (version !== generation) return;
  const extension = extensionOf();
  const user = getSession().user;
  if (!extension || !user || !voicePassword)
    throw new Error("Cisco requires agent extension and login credentials.");
  useCallStore.getState().patch({ stack: "finesse" });
  bindFinessePresence();
  postFinesse({
    action: "registerCallback",
    parameter: { callbackFunction: voiceCallback("finesse", version) },
  });
  postFinesse({
    action: "login",
    parameter: {
      loginId: user.username,
      password: voicePassword,
      extension,
      isSSOUser: finesseSso,
      clientCallbackFunction: voiceCallback("finesse", version),
    },
  });
}
