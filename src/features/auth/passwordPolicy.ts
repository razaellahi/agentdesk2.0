import type { PasswordPolicy } from "@/core/auth";

export interface PolicyRule {
  type: string;
  /** i18n key + params for the rule text (change-password namespace). */
  labelKey: string;
  params: Record<string, string>;
  /** null when the rule can only be verified by the server (history, regex). */
  check: ((password: string, username: string) => boolean) | null;
}

const count = (re: RegExp, s: string) => (s.match(re) ?? []).length;

/**
 * Keycloak password policies (agent-manager /agent/pswd-policies) mapped to
 * display rules and live checks — same mapping as unified-agent's
 * ChangePasswordDialogComponent.policyMap.
 */
export function toRules(policies: PasswordPolicy[]): PolicyRule[] {
  const rules: PolicyRule[] = [];
  for (const { type, value } of policies) {
    const n = Number(value) || 0;
    switch (type) {
      case "length":
        if (n)
          rules.push({
            type,
            labelKey: "change-password.min-policy",
            params: { min: value },
            check: (p) => p.length >= n,
          });
        break;
      case "maxLength":
        if (n)
          rules.push({
            type,
            labelKey: "change-password.max-policy",
            params: { max: value },
            check: (p) => p.length <= n,
          });
        break;
      case "lowerCase":
        if (n)
          rules.push({
            type,
            labelKey: "change-password.lowercase-policy",
            params: { count: value },
            check: (p) => count(/[a-z]/g, p) >= n,
          });
        break;
      case "upperCase":
        if (n)
          rules.push({
            type,
            labelKey: "change-password.uppercase-policy",
            params: { count: value },
            check: (p) => count(/[A-Z]/g, p) >= n,
          });
        break;
      case "digits":
        if (n)
          rules.push({
            type,
            labelKey: "change-password.number-policy",
            params: { count: value },
            check: (p) => count(/\d/g, p) >= n,
          });
        break;
      case "specialChars":
        if (n)
          rules.push({
            type,
            labelKey: "change-password.special-chars-policy",
            params: { count: value },
            check: (p) => count(/[^a-zA-Z0-9]/g, p) >= n,
          });
        break;
      case "notUsername":
        rules.push({
          type,
          labelKey: "change-password.must-not-username",
          params: {},
          check: (p, u) => !u || p.toLowerCase() !== u.toLowerCase(),
        });
        break;
      case "notEmail":
        rules.push({ type, labelKey: "change-password.must-not-email", params: {}, check: null });
        break;
      case "passwordHistory":
        if (n)
          rules.push({
            type,
            labelKey: "change-password.password-history-policy",
            params: { count: value },
            check: null,
          });
        break;
      case "regexPattern":
        rules.push({ type, labelKey: "change-password.regex-policy", params: {}, check: null });
        break;
      default:
        // Backend-only policies (hashing, expiry) are not shown to the user.
        break;
    }
  }
  return rules;
}

export function unmetRules(rules: PolicyRule[], password: string, username: string): PolicyRule[] {
  return rules.filter((r) => r.check && !r.check(password, username));
}
