import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { getConfig } from "@/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { can, getSession, useCurrentUser, type Team } from "@/core/auth";
import { formatDuration } from "@/core/i18n";
import { socketManager } from "@/core/realtime";
import { superviseVoice } from "@/features/voice";
import { fetchActiveChats, fetchBotChats } from "./api";
import {
  agentNames,
  asArray,
  chatsFromBuckets,
  matchesAgentSearch,
  sortBySeconds,
  type ChatBucket,
  type ChatRow,
} from "./model";
import { ReportFrame, ReportTable, Td, Th } from "./ReportTable";
import { useQueryError } from "./useQueryError";

const NO_TEAMS: Team[] = [];

function joinWhisper(chat: ChatRow) {
  if (!can("supervisor") || !socketManager.connected) return;
  const session = chat.activeChannelSessions?.[0];
  const user = getSession().user;
  if (!session?.conversationId || !user) return;
  const already = chat.agentDetails?.some((agent) => agent.userName === user.username);
  if (already) {
    socketManager.emit("joinAsWhisper", {
      participantId: user.id,
      conversationId: session.conversationId,
      roomInfo: session.roomInfo,
    });
    return;
  }
  socketManager.emit("joinPullModeRequest", {
    topicParticipant: {
      id: crypto.randomUUID(),
      type: "AGENT",
      participant: {
        id: user.id,
        participantType: "CCUser",
        keycloakUser: user,
        associatedRoutingAttributes: [],
      },
      token: null,
      conversationId: session.conversationId,
      role: "WHISPER",
      userCredentials: null,
      state: "SUBSCRIBED",
    },
    agentId: user.id,
    channelSession: session,
  });
}

function joinSilentMonitor(chat: ChatRow) {
  if (!can("supervisor") || !socketManager.connected) return;
  const sessions = chat.activeChannelSessions ?? [];
  const voice = sessions.find((session) => session.channel?.channelType?.name === "CX_VOICE");
  if (voice) {
    void superviseVoice("silentMonitor", {
      number: voice.channelData?.channelCustomerIdentifier,
      serviceIdentifier: voice.channelData?.serviceIdentifier,
    }).catch((error: Error) => toast.error(error.message));
    return;
  }
  const session = sessions[0];
  const user = getSession().user;
  if (!session?.conversationId || !user) return;
  socketManager.emit("JoinAsSilentMonitor", {
    topicParticipant: {
      id: crypto.randomUUID(),
      type: "AGENT",
      participant: {
        id: user.id,
        participantType: "CCUser",
        keycloakUser: user,
        associatedRoutingAttributes: [],
      },
      token: null,
      conversationId: session.conversationId,
      role: "SILENT_MONITOR",
      userCredentials: null,
      state: "SUBSCRIBED",
    },
    agentId: user.id,
    channelSession: session,
  });
}

function bargeIn(chat: ChatRow) {
  const voice = chat.activeChannelSessions?.find(
    (session) => session.channel?.channelType?.name === "CX_VOICE",
  );
  const dialogId =
    (voice as { dialogId?: string } | undefined)?.dialogId ??
    voice?.channelData?.additionalAttributes?.find((attr) => attr.key?.toLowerCase() === "callid")?.value;
  if (!dialogId) return;
  void superviseVoice("bargeIn", { dialogId }).catch((error: Error) => toast.error(error.message));
}

export default function LivePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const teams = user?.supervisedTeams ?? NO_TEAMS;
  const [teamId, setTeamId] = useState(teams[0]?.teamId ?? "");
  const [answeredBy, setAnsweredBy] = useState<"agents" | "bots">("agents");
  const [state, setState] = useState("ALL");
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const refresh = getConfig().DASHBOARD_REFRESH_TIME;
  const supervisorName = user?.roles?.includes("supervisor") ? (user.username ?? "") : "";

  const agentsQuery = useQuery({
    queryKey: ["supervise", "active", teamId, supervisorName],
    queryFn: () => fetchActiveChats(teamId, supervisorName),
    enabled: answeredBy === "agents" && Boolean(teamId),
    refetchInterval: refresh,
  });
  const botsQuery = useQuery({
    queryKey: ["supervise", "bots"],
    queryFn: fetchBotChats,
    enabled: answeredBy === "bots",
    refetchInterval: refresh,
  });

  const query = answeredBy === "agents" ? agentsQuery : botsQuery;
  useQueryError(
    query.isError,
    t(
      answeredBy === "agents"
        ? "snackbar.Error-Getting-Active-Chats-with-Agents"
        : "snackbar.Error-Getting-Active-Chats-with-Bots",
    ),
  );

  const rows = useMemo(() => {
    const buckets = asArray<ChatBucket>(query.data);
    const flat = chatsFromBuckets(buckets, answeredBy === "agents" ? state : "ALL");
    const filtered = flat.filter((chat) => matchesAgentSearch(chat, search));
    return sortBySeconds(filtered, "activeSince", order);
  }, [query.data, answeredBy, state, search, order]);

  return (
    <ReportFrame
      toolbar={
        <>
          <Select value={answeredBy} onValueChange={(value) => setAnsweredBy(value as "agents" | "bots")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agents">{t("supervisor.answered-by-agents")}</SelectItem>
              <SelectItem value="bots">{t("supervisor.answered-by-bot")}</SelectItem>
            </SelectContent>
          </Select>
          {answeredBy === "agents" && teams.length > 0 && (
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("supervisor.select-team")} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.teamId} value={team.teamId}>
                    {team.teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {answeredBy === "agents" && (
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("globals.state")}</SelectItem>
                <SelectItem value="ACTIVE">{t("supervisor.active")}</SelectItem>
                <SelectItem value="ON_HOLD">{t("globals.states.on-hold")}</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("supervisor.search-agent")}
            className="w-48"
          />
        </>
      }
    >
      <ReportTable>
        <thead>
          <tr>
            <Th>{t("globals.direction")}</Th>
            <Th>{t("globals.channel")}</Th>
            <Th>{t("supervisor.customer")}</Th>
            <Th>{t("supervisor.state")}</Th>
            <Th>
              <button type="button" onClick={() => setOrder((value) => (value === "asc" ? "desc" : "asc"))}>
                {t("supervisor.active-since")}
              </button>
            </Th>
            <Th>{answeredBy === "agents" ? t("supervisor.agent") : t("supervisor.bot")}</Th>
            <Th>{t("supervisor.queue")}</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <Td className="text-muted-foreground">
                {query.isLoading ? t("supervisor.loading-dashboard") : t("globals.no-data-available")}
              </Td>
            </tr>
          )}
          {rows.map((chat, index) => (
            <tr key={chat.conversationId ?? index}>
              <Td>{chat.direction}</Td>
              <Td>
                {chat.activeChannelSessions
                  ?.map((session) => session.channel?.channelType?.name)
                  .filter(Boolean)
                  .join(", ") || chat.channelType}
              </Td>
              <Td>
                <div>{chat.customerName}</div>
                {chat.channelIdentity && (
                  <div className="text-xs text-muted-foreground">{chat.channelIdentity}</div>
                )}
              </Td>
              <Td>{chat.conversationState}</Td>
              <Td>{formatDuration(chat.activeSince ?? 0)}</Td>
              <Td>{answeredBy === "agents" ? agentNames(chat) : chat.botName}</Td>
              <Td>{chat.queueName}</Td>
              <Td>
                <div className="flex flex-wrap justify-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      joinWhisper(chat);
                      void navigate("/conversations");
                    }}
                  >
                    {t("labels.join-as-whisper")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      joinSilentMonitor(chat);
                      void navigate("/conversations");
                    }}
                  >
                    {t("supervisor.silent-monitor")}
                  </Button>
                  {chat.activeChannelSessions?.some(
                    (session) => session.channel?.channelType?.name === "CX_VOICE",
                  ) && (
                    <Button size="sm" variant="outline" onClick={() => bargeIn(chat)}>
                      {t("supervisor.barge-in")}
                    </Button>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </ReportFrame>
  );
}
