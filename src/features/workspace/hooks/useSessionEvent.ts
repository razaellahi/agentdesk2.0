import { useEffect, useEffectEvent } from "react";
import { onSessionEvent, type SessionEventName } from "../session/agentSession";

/** Runs the handler whenever the agent session publishes this event, while mounted. */
export function useSessionEvent<T>(name: SessionEventName, handler: (detail: T) => void) {
  const handle = useEffectEvent(handler);
  useEffect(() => onSessionEvent<T>(name, (detail) => handle(detail)), [name]);
}
