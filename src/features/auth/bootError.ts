import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/core/api";
import { useSessionStore } from "@/core/auth";

/** Failed Finesse/CRM SSO attempt from bootstrap, shown once on the login page. */
let ssoFailure: unknown = null;

export function setSsoFailure(error: unknown) {
  ssoFailure = error;
}

function takeSsoFailure(): unknown {
  const error = ssoFailure;
  ssoFailure = null;
  return error;
}

export function useBootError(): string | null {
  const { t } = useTranslation();
  const endReason = useSessionStore((s) => s.endReason);
  const [sso] = useState(takeSsoFailure);
  if (endReason)
    return t(`auth.session-ended.${endReason}`, { defaultValue: t("auth.session-ended.default") });
  if (!sso) return null;
  return sso instanceof ApiError ? sso.message : t("snackbar.error-on-login-request");
}
