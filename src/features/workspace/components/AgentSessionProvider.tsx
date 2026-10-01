import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { usePermission, useSessionStore } from "@/core/auth";
import { startAgentSession, stopAgentSession } from "../session/agentSession";

export const WORKSPACE_PATH = "/conversations";

/**
 * Starts the realtime agent session for agent/supervisor users while the shell
 * is mounted (above all routes, so navigating never drops a conversation or call).
 */
export function AgentSessionProvider({ fcmKey }: { fcmKey: string | null }) {
  const allowed = usePermission("agentSession");
  const userId = useSessionStore((s) => s.user?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);

  useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!allowed || !userId) return;
    startAgentSession(
      {
        openWorkspace: () => {
          if (!pathRef.current.startsWith(WORKSPACE_PATH)) navigate(WORKSPACE_PATH);
        },
        isWorkspaceVisible: () => pathRef.current.startsWith(WORKSPACE_PATH),
      },
      fcmKey,
    );
    return () => stopAgentSession();
  }, [allowed, userId, fcmKey, navigate]);

  return null;
}
