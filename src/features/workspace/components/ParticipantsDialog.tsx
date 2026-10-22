import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser, usePermission } from "@/core/auth";
import { voiceCommand } from "@/features/voice";
import { useMaskedValue } from "../hooks/useMaskedValue";
import { useVoiceStacks } from "../hooks/useLiveCall";
import { channelLabel } from "../model/display";
import { cxVoiceSessionOf, visibleAgents } from "../model/participants";
import type { AgentParticipant, ChannelSession, Conversation } from "../model/types";
import { completeConsult } from "../session/assistance";
import { ChannelBadge } from "./ChannelIcon";
import { CustomerAvatar } from "./CustomerInitials";

const ROLE_KEY: Record<string, string> = {
  PRIMARY: "primary",
  WHISPER: "whisper",
  SILENT_MONITOR: "silent-monitor",
  ASSISTANT: "assistant",
  WRAP_UP: "wrap-up",
  BARGE_IN: "barge-in",
};

function agentName(participant: AgentParticipant["participant"]) {
  const user = participant.keycloakUser;
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username;
}

function Person({
  name,
  detail,
  role,
  you,
  actions,
  children,
}: {
  name: string;
  detail?: string;
  role?: string;
  you?: boolean;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <li className="flex items-start gap-3 py-2">
      <CustomerAvatar name={name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium">
          <span className="truncate">{name}</span>
          {you && (
            <span className="rounded-full bg-primary-soft px-1.5 text-xs font-medium text-primary">
              {t("workspace.participants.you")}
            </span>
          )}
          {role && (
            <span className="rounded-full bg-surface-2 px-1.5 text-xs font-medium text-muted-foreground">
              {role}
            </span>
          )}
        </p>
        {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1 self-center">{actions}</div>}
    </li>
  );
}

/** One channel the customer is on; the identifier is PII and masked like the profile. */
function SessionLine({ conversation, session }: { conversation: Conversation; session: ChannelSession }) {
  const name = session.channel.channelType.name;
  const identifier = useMaskedValue(
    session.channelData.channelCustomerIdentifier,
    name.toLowerCase() === "email" ? "email" : "phoneNumber",
    conversation.roomInfo === "FAKE_CONVERSATION" ? "manage" : "manage_in_conversation",
  );
  return (
    <li className="flex items-center gap-2 text-xs text-muted-foreground">
      <ChannelBadge channelType={session.channel.channelType} size="sm" />
      <span className="truncate">{[channelLabel(name), identifier].filter(Boolean).join(" · ")}</span>
    </li>
  );
}

/**
 * Everyone in a conversation: the customer with the channels they are on, and the agents
 * with their roles. A supervisor monitoring silently is never listed. A primary agent
 * completes a consult here, on the consulted agent's row (unified-agent participants list).
 */
export function ParticipantsDialog({
  conversation,
  customerName,
  open,
  onOpenChange,
}: {
  conversation: Conversation;
  /** Already masked for this screen. */
  customerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const stacks = useVoiceStacks();
  const canTransfer = usePermission("directTransfer");
  const canConference = usePermission("conference");
  const roleLabel = (role: string) => {
    const key = ROLE_KEY[role.toUpperCase()];
    return key ? t(`workspace.participants.role-${key}`) : role.toLowerCase().replaceAll("_", " ");
  };
  const me = conversation.topicParticipant;
  const agents = [
    { ...me, you: true },
    ...visibleAgents(conversation).map((participant) => ({ ...participant, you: false })),
  ];
  const sessions = conversation.activeChannelSessions;
  const completing = me.role === "PRIMARY" && conversation.state === "ACTIVE";
  const onCall = Boolean(cxVoiceSessionOf(conversation, stacks));

  // A CX Voice consult completes on the call itself; a chat consult through the conversation.
  const complete = (agent: AgentParticipant, action: "transfer" | "conference") => {
    if (onCall) {
      try {
        voiceCommand(action === "transfer" ? "consultTransfer" : "conference");
      } catch (error) {
        toast.error((error as Error).message);
        return;
      }
    } else if (!completeConsult(conversation, action, agent)) {
      toast.error(t("snackbar.Unable-to-send-the-message-at-the-moment"));
      return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("workspace.participants.title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("workspace.participants.description")}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-auto">
          <section>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">
              {t("workspace.participants.customer")}
            </h3>
            <ul>
              <Person name={customerName || t("globals.UNIDENTIFIED-CUSTOMER")}>
                {sessions.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {sessions.map((session) => (
                      <SessionLine key={session.id} conversation={conversation} session={session} />
                    ))}
                  </ul>
                )}
              </Person>
            </ul>
          </section>
          <section>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">
              {t("workspace.participants.agents", { count: agents.length })}
            </h3>
            <ul className="divide-y divide-border/50">
              {agents.map((agent) => (
                <Person
                  key={agent.participant.id}
                  name={
                    agent.you && user
                      ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
                        agentName(agent.participant)
                      : agentName(agent.participant)
                  }
                  detail={agent.participant.keycloakUser.username}
                  role={roleLabel(agent.role)}
                  you={agent.you}
                  actions={
                    completing &&
                    !agent.you &&
                    agent.role === "ASSISTANT" && (
                      <>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          disabled={!canTransfer}
                          title={t("chat-features.interactions.consult-transfer")}
                          onClick={() => complete(agent, "transfer")}
                        >
                          {t("chat-features.interactions.Transfer")}
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          disabled={!canConference}
                          title={t("chat-features.interactions.consult-conference")}
                          onClick={() => complete(agent, "conference")}
                        >
                          {t("chat-features.interactions.Conference")}
                        </Button>
                      </>
                    )
                  }
                />
              ))}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
