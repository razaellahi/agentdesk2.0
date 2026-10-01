export interface PermittedResource {
  rsname: string;
  scopes: string[];
}

export interface Team {
  teamId: string;
  teamName: string;
}

/** keycloak_User as returned by agent-manager /agent/login. */
export interface KeycloakUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  tenant?: { id?: string; name?: string | null } | string | null;
  teams?: { id: string; name: string }[];
  permittedResources?: { Resources?: PermittedResource[] };
  attributes?: Record<string, string[] | undefined> & { agentExtension?: string[] };
  supervisedTeams?: Team[];
  userTeam?: Team;
  [key: string]: unknown;
}

export type TwoFAChannel = "app" | "sms" | "email" | "rsa";

export interface LoginData {
  token: string;
  refresh_token: string;
  keycloak_User: KeycloakUser;
  is2FAEnabled?: boolean;
  twoFAChannel?: string;
  is2FARegistered?: boolean;
  qrImage?: string;
  otpSecret?: string;
  phoneNumber?: string;
  email?: string;
  passwordExpiration?: string;
}

export interface LoginResponse {
  data: LoginData;
  statusCode?: number;
}

export interface PasswordCredentials {
  username: string;
  password: string;
}

/** Finesse gadget SSO payload (unified-agent autoFinesseLogin). */
export interface FinesseLoginPayload {
  username: string;
  roles: unknown;
  finesseUrl: string;
  password: string;
  authToken: string;
  authWithSSO: boolean;
}

/** External CRM SSO payload (unified-agent externalServiceLogin). */
export interface ExternalServiceLoginPayload {
  validationToken: string;
  url: string;
  userRoles: string[];
  source: string;
}

export type LoginMethod = "password" | "finesse" | "external";
