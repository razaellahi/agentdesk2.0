import type { AgentDeskSettingsDoc } from "@/core/agent-settings";
import type { KeycloakUser } from "@/core/auth";

const r = (rsname: string, ...scopes: string[]) => ({ rsname, scopes });

/** Mock users: log in with these usernames (any password) in `pnpm mock`. */
export const MOCK_USERS: Record<
  string,
  { user: KeycloakUser; realmRoles: string[]; clientRoles?: string[]; twoFA?: string }
> = {
  agent: {
    realmRoles: ["agent", "download"],
    clientRoles: ["case-cc-agent"],
    user: {
      id: "u-agent-1",
      username: "agent",
      firstName: "Sana",
      lastName: "Iqbal",
      roles: ["agent"],
      tenant: { id: "t-1", name: "expertflow" },
      attributes: { agentExtension: ["1001"] },
      userTeam: { teamId: "team-1", teamName: "Support" },
      permittedResources: {
        Resources: [
          r("customer", "view", "manage", "manage_in_conversation", "masked_pii"),
          r("customer-labels", "assign_label"),
          r("agent-dashboard", "view"),
          r(
            "agent-conversation-control",
            "view_initiate_chat",
            "view_wrap_up",
            "view_leave_chat",
            "view_history",
            "view_direct_transfer",
            "view_consult",
            "view_conference",
          ),
          r("state-change", "manage_state_change"),
          r("recording-link", "view"),
        ],
      },
    },
  },
  supervisor: {
    realmRoles: ["supervisor", "agent", "download", "export", "viewtag"],
    clientRoles: ["case-backoffice-manager"],
    user: {
      id: "u-sup-1",
      username: "supervisor",
      firstName: "Omar",
      lastName: "Khan",
      roles: ["supervisor", "agent"],
      tenant: { id: "t-1", name: "expertflow" },
      supervisedTeams: [{ teamId: "team-1", teamName: "Support" }],
      permittedResources: {
        Resources: [
          r("customer", "view", "manage", "view_pii"),
          r("customer-labels", "assign_label", "manage"),
          r("customer-schema", "view", "manage"),
          r("supervisor", "view_all"),
          r("subscribed-list", "view", "manage"),
          r(
            "agent-conversation-control",
            "view_initiate_chat",
            "view_wrap_up",
            "view_leave_chat",
            "view_history",
          ),
          r("state-change", "manage_state_change"),
          r("recording-link", "view_all"),
          r("call_recording_control", "manage_call_recording_control"),
          r("teams", "view", "manage"),
          r("forms", "view"),
        ],
      },
    },
  },
  admin: {
    realmRoles: ["admin", "evaluatetag"],
    clientRoles: ["case-admin"],
    user: {
      id: "u-admin-1",
      username: "admin",
      firstName: "Ayesha",
      lastName: "Malik",
      roles: ["admin"],
      tenant: { id: "t-1", name: "expertflow" },
      permittedResources: {
        Resources: [
          r("agent-desk-setting", "view", "manage"),
          r("teams", "view", "manage"),
          r("forms", "view", "manage"),
        ],
      },
    },
  },
  viewer: {
    realmRoles: [],
    user: {
      id: "u-viewer-1",
      username: "viewer",
      firstName: "View",
      lastName: "Only",
      roles: [],
      tenant: { id: "t-1", name: "expertflow" },
      permittedResources: { Resources: [r("agent-desk-setting", "view")] },
    },
  },
  otp: {
    twoFA: "app",
    realmRoles: ["agent"],
    user: {
      id: "u-otp",
      username: "otp",
      firstName: "Two",
      lastName: "Factor",
      roles: ["agent"],
      permittedResources: { Resources: [] },
    },
  },
};

/**
 * Unsigned JWT carrying realm roles, `cim` client roles and the user id (the app only
 * decodes, never verifies; the Case Management mock reads roles and `sub` from it).
 */
export function fakeJwt(
  realmRoles: string[],
  options: { clientRoles?: string[]; sub?: string; username?: string } = {},
): string {
  const enc = (o: object) =>
    btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const claims = {
    sub: options.sub,
    preferred_username: options.username,
    realm_access: { roles: realmRoles },
    resource_access: options.clientRoles?.length ? { cim: { roles: options.clientRoles } } : undefined,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  return `${enc({ alg: "none", typ: "JWT" })}.${enc(claims)}.`;
}

/** JWT for a mock user, as the login and refresh mocks issue it. */
export function mockUserJwt(username: string): string {
  const entry = MOCK_USERS[username];
  if (!entry) return fakeJwt([]);
  return fakeJwt(entry.realmRoles, {
    clientRoles: entry.clientRoles,
    sub: entry.user.id,
    username: entry.user.username,
  });
}

export const MOCK_DESK_SETTINGS: AgentDeskSettingsDoc = {
  id: "ads-1",
  messagingComposition: {
    isMessageFormattingEnabled: true,
    isTextRefineEnabled: true,
    isSpellCheckEnabled: true,
    isEmojisEnabled: true,
    isFileSharingEnabled: true,
  },
  knowledgeAiAssistance: {
    isKnowledgeBaseSearchEnabled: true,
    knowledgeBaseUrl: "https://kb.example.com/query",
  },
  voiceTelephony: {
    isVoicemailEnabled: true,
    isCallingComplianceEnabled: false,
    isCiscoEnabled: false,
    isCxVoiceEnabled: true,
    isWebRtcVideoEnabled: false,
    ciscoSettings: { finesseFlavor: "UCCX", isGadget: true, callVariable: "callVariable1" },
    cxVoiceSettings: { autoCallAnswerTimer: 2, sipMonitoringDn: "*44", enableSipLogs: false },
  },
  crmIntegration: { enableVoiceEventsForCrm: false, isCrmEventsEnabled: false },
  conversationHandling: {
    isAutoAnswerEnabled: false,
    autoAnswerDelay: 5000,
    isWrapUpEnabled: true,
    wrapUpTime: 60,
    isConversationParticipantsEnabled: true,
    isShowActiveChannelsDataEnabled: true,
    holdConversation: [1, 3, 5, 7, 10].map((value) => ({
      label: value === 1 ? "1 Minute" : `${value} Minutes`,
      value,
    })),
    isInactivityTimerEnabled: false,
    inactivityTimeoutSeconds: 100,
    isOutboundSmsEnabled: true,
    isOutboundSmsSendandClose: false,
    prefixCode: "+92",
  },
  workspacePreferences: { dashboardRefreshTime: 10000 },
};

export const MOCK_LOCALE_SETTING = {
  id: "loc-1",
  supportedLanguages: [
    { code: "en", name: "English" },
    { code: "ar", name: "Arabic" },
    { code: "fr", name: "French" },
    { code: "ger", name: "German" },
    { code: "ur", name: "Urdu" },
  ],
  defaultLanguage: { code: "en", name: "English" },
  timezone: { id: 1, name: "Asia/Karachi" },
};

/** Small translation set for the admin Translations screen (reference = en). */
export const MOCK_TRANSLATIONS: Record<string, Record<string, unknown>> = {
  en: {
    login: { login: "Login", username: "Username", password: "Password" },
    globals: { yes: "Yes", accept: "Accept", reject: "Reject" },
    "app-header": { ready: "Ready", logout: "Logout" },
  },
  fr: {
    login: { login: "Connexion", username: "Nom d'utilisateur", password: "Mot de passe" },
    globals: { yes: "Oui", accept: "Accepter", reject: "Rejeter" },
    "app-header": { ready: "Prêt", logout: "Déconnexion" },
  },
  ar: {
    login: { login: "تسجيل الدخول", username: "اسم المستخدم", password: "كلمة المرور" },
    globals: { yes: "نعم", accept: "قبول", reject: "رفض" },
    "app-header": { ready: "جاهز", logout: "تسجيل الخروج" },
  },
};
