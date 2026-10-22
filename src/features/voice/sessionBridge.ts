import { toast } from "sonner";
import { getDeskSettings } from "@/core/agent-settings";
import { routingEngineApi } from "@/core/api";
import { getSession } from "@/core/auth";
import { t } from "@/core/i18n";
import { cxVoiceSessionOf, getConversation, onSessionEvent } from "@/features/workspace";
import { useCallStore } from "./callStore";
import { voiceCommand } from "./commands";

interface NamedAssistance {
  conversationId?: string;
  type?: string;
  task?: { assignedTo?: { id?: string } | null };
}

interface QueueAgents {
  availableAgents?: { id?: string; extensions?: string[] }[];
}

/** The extension the routing engine lists for an agent who can take this conversation. */
async function extensionOf(conversationId: string, agentId: string) {
  const queues = await routingEngineApi.get<QueueAgents[]>("/precision-queues/available-agents", {
    searchParams: { conversationId, agentId: getSession().user?.id ?? "", includeUnavailableAgents: false },
  });
  const agent = (Array.isArray(queues) ? queues : [])
    .flatMap((queue) => queue.availableAgents ?? [])
    .find((row) => row.id === agentId);
  return agent?.extensions?.[0] ?? null;
}

/**
 * A consult or transfer of a CX Voice call to a named agent: the routing engine names
 * the agent, and the call is consulted or transferred to their extension over SIP.
 */
async function dialAssignedAgent(data: NamedAssistance) {
  const conversation = data.conversationId ? getConversation(data.conversationId) : undefined;
  const action = data.type === "consult" ? "consult" : data.type === "direct-transfer" ? "transfer" : null;
  const agentId = data.task?.assignedTo?.id;
  if (!conversation || !action || !agentId) return;
  try {
    if (!cxVoiceSessionOf(conversation, getDeskSettings())) return;
    const extension = await extensionOf(conversation.conversationId, agentId);
    if (!extension) throw new Error(t("snackbar.CX-Voice-call-canceled"));
    voiceCommand(action, { number: extension });
  } catch (error) {
    toast.error((error as Error).message);
  }
}

/** The monitored CX Voice call ended: the supervisor's monitoring leg ends with it. */
function endMonitoring() {
  const leg = useCallStore.getState().main;
  if (!leg) return;
  try {
    voiceCommand("end", { dialogId: leg.id });
  } catch {
    /* already gone */
  }
}

/** Voice reactions to the agent session; returns the unsubscribe. */
export function bindSessionEvents() {
  const stops = [
    onSessionEvent<NamedAssistance>("namedAssistance", (data) => void dialAssignedAgent(data)),
    onSessionEvent("monitoredVoiceEnded", endMonitoring),
  ];
  return () => stops.forEach((stop) => stop());
}
