import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@/core/auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { channelLabel, customerDisplayName } from "../model/display";
import type { AgentParticipant, Conversation } from "../model/types";
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
  children,
}: {
  name: string;
  detail?: string;
  role?: string;
  you?: boolean;
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
    </li>
  );
}

/** Everyone in a conversation: the customer with the channels they are on, and the agents with their roles. */
export function ParticipantsDialog({
  conversation,
  open,
  onOpenChange,
}: {
  conversation: Conversation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const roleLabel = (role: string) => {
    const key = ROLE_KEY[role.toUpperCase()];
    return key ? t(`workspace.participants.role-${key}`) : role.toLowerCase().replaceAll("_", " ");
  };
  const me = conversation.topicParticipant;
  const agents = [
    { ...me, you: true },
    ...conversation.agentParticipants.map((participant) => ({ ...participant, you: false })),
  ];
  const sessions = conversation.activeChannelSessions;
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
              <Person name={customerDisplayName(conversation.customer) || t("globals.UNIDENTIFIED-CUSTOMER")}>
                {sessions.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {sessions.map((session) => (
                      <li key={session.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ChannelBadge channelType={session.channel.channelType} size="sm" />
                        <span className="truncate">
                          {[
                            channelLabel(session.channel.channelType.name),
                            session.channelData.channelCustomerIdentifier,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </li>
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
                />
              ))}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
