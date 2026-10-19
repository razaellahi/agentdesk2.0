import { reportingApi, routingEngineApi } from "@/core/api";
import { asArray, type AgentRow, type ChatBucket, type Mrd } from "./model";

export interface AgentActivity {
  agents?: AgentRow[];
}

export function fetchActiveChats(teamId: string, supervisorName: string) {
  return reportingApi.post<ChatBucket[]>("/queue-active-chats/detail", {
    teamId,
    queues: [],
    supervisorName,
  });
}

export function fetchBotChats() {
  return reportingApi.get<ChatBucket[]>("/bot-active-chats/detail");
}

export function fetchQueuedChats(teamId: string) {
  return reportingApi.post<ChatBucket[]>("/queued-chats/detail", {
    teamId,
    queues: [],
    supervisorName: "",
  });
}

export function fetchAgentActivity(list: { teamId: string; supervisorName: string }[]) {
  return reportingApi.post<AgentActivity>("/agent-activity/detail", { list });
}

export async function fetchMrds() {
  return asArray<Mrd>(await routingEngineApi.get("/media-routing-domains"));
}
