import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useBlocker } from "react-router";
import { confirm } from "./confirm";

/**
 * Blocks in-app navigation and tab close while `dirty` (replaces unified-admin's
 * UnsavedChangesGuard + beforeunload listeners).
 */
export function useUnsavedChanges(dirty: boolean, message?: string) {
  const { t } = useTranslation();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    let active = true;
    void confirm({
      title: t("common.unsaved-title"),
      description: message ?? t("common.unsaved-leave"),
      confirmLabel: t("common.discard-changes"),
      destructive: true,
    }).then((ok) => {
      if (!active) return;
      if (ok) blocker.proceed();
      else blocker.reset();
    });
    return () => {
      active = false;
    };
  }, [blocker, message, t]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
