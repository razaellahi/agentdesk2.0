import { useEffect } from "react";
import { toast } from "sonner";
import { getConfig } from "@/config";
import { applyPreferences, loadPreferences } from "@/core/agent-settings";
import { useSessionStore } from "@/core/auth";
import { t } from "@/core/i18n";
import { queryClient } from "./queryClient";

/**
 * Applies per-user state whenever a session starts (login or reload restore):
 * saved theme / language / density from /agentSetting, and the password-expiry
 * warning. Clears cached server data when the session ends.
 */
export function SessionEffects() {
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const status = useSessionStore((s) => s.status);
  const passwordExpiry = useSessionStore((s) => s.passwordExpiryMessage);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void loadPreferences(userId).then((prefs) => {
      if (!cancelled && prefs) applyPreferences(prefs);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (status === "anonymous") queryClient.clear();
  }, [status]);

  useEffect(() => {
    if (!passwordExpiry) return;
    // Same parsing as unified-agent _showPasswordWarningFromLogin.
    const days = /in\s+(\d+)\s+day/i.exec(passwordExpiry)?.[1] ?? "";
    const date = /on\s+(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(passwordExpiry)?.[1] ?? "";
    toast.warning(t("change-password.password-expiry-warning"), {
      description: t("change-password.password-expiry-warning-message", { days, date }),
      duration: 15_000,
    });
    useSessionStore.getState().setPasswordExpiryMessage(null);
  }, [passwordExpiry]);

  useEffect(() => {
    // Keep the document title in sync with environment for non-prod deployments.
    const env = getConfig().ENV;
    document.title = env && env !== "prod" ? `Agent Desk · ${env}` : "Agent Desk";
  }, []);

  return null;
}
