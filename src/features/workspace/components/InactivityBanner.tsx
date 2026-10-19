import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeskSettings } from "@/core/agent-settings";
import { logout, useSessionStore } from "@/core/auth";
import { useCallStore } from "@/features/voice";
import { INACTIVITY_REASON, inactivityTick } from "../session/inactivity";

const ACTIVITY = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;

/**
 * Unified-agent inactivity logout: starts after login when the desk setting is on,
 * pauses while the tab is hidden or the window is blurred, warns at 80%.
 */
export function InactivityBanner() {
  const { t } = useTranslation();
  const settings = useDeskSettings();
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const callPhase = useCallStore((s) => s.phase);
  const [seconds, setSeconds] = useState(0);
  const enabled = Boolean(userId && settings?.inactivityTimer && settings.inactivityTimeoutSeconds > 0);
  const timeoutMs = (settings?.inactivityTimeoutSeconds ?? 0) * 1000;

  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    let stopped = false;
    const reset = () => {
      last = Date.now();
      setSeconds(0);
    };
    const paused = () => document.hidden || !document.hasFocus() || callPhase !== "idle";
    for (const name of ACTIVITY) globalThis.addEventListener(name, reset, { passive: true });
    document.addEventListener("visibilitychange", reset);
    globalThis.addEventListener("blur", reset);
    globalThis.addEventListener("focus", reset);
    const timer = globalThis.setInterval(() => {
      if (stopped || paused()) {
        last = Date.now();
        setSeconds(0);
        return;
      }
      const tick = inactivityTick(Date.now() - last, timeoutMs);
      if (tick.logout) {
        stopped = true;
        void logout(INACTIVITY_REASON, "inactivity");
        return;
      }
      setSeconds(tick.warnSeconds);
    }, 1000);
    return () => {
      stopped = true;
      globalThis.clearInterval(timer);
      for (const name of ACTIVITY) globalThis.removeEventListener(name, reset);
      document.removeEventListener("visibilitychange", reset);
      globalThis.removeEventListener("blur", reset);
      globalThis.removeEventListener("focus", reset);
    };
  }, [enabled, timeoutMs, callPhase]);

  if (!enabled || seconds <= 0) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 border-b bg-warning-soft px-4 py-2 text-sm text-warning-text"
    >
      <span className="font-medium">{t("inactivity-timeout.session-expiring-soon")}</span>
      <span>
        {t("inactivity-timeout.your-session-will-expire-in")} {seconds} {t("inactivity-timeout.seconds")}
      </span>
    </div>
  );
}
