import { useEffect, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSocketStatus } from "@/core/realtime";
import { cn } from "@/shared/lib/utils";

/** A connect that finishes within this time (normal sign-in) shows nothing. */
const CONNECTING_GRACE_MS = 1500;

/**
 * Slim bar under the top bar while realtime is connecting or down. It sits in the
 * layout (nothing is covered) and only appears when the agent should know: a
 * lost connection at once, a slow connect after a short grace period.
 */
export function ConnectionStatusHost() {
  const { t } = useTranslation();
  const status = useSocketStatus();
  const down = status === "disconnected" || status === "error";
  const connecting = status === "connecting";
  const [graceOver, setGraceOver] = useState(false);

  useEffect(() => {
    if (!connecting) return;
    const timer = setTimeout(() => setGraceOver(true), CONNECTING_GRACE_MS);
    return () => {
      clearTimeout(timer);
      setGraceOver(false);
    };
  }, [connecting]);

  if (!down && !(connecting && graceOver)) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex shrink-0 items-center justify-center gap-2 border-b px-4 py-1.5 text-xs font-medium",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1",
        down
          ? "border-destructive/20 bg-destructive-soft text-destructive-text"
          : "border-border/60 bg-surface-2 text-muted-foreground",
      )}
    >
      {down ? (
        <WifiOff className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
      )}
      <span className="truncate">
        <span className="font-semibold">
          {down ? t("workspace.connection-lost") : t("workspace.connecting")}
        </span>
        <span className="hidden sm:inline">
          {" · "}
          {down ? t("workspace.connection-lost-hint") : t("workspace.connection-reconnecting-hint")}
        </span>
      </span>
    </div>
  );
}
