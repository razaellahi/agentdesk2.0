import { MessagesSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useMatch } from "react-router";
import { UnreadBadge } from "@/components/common/UnreadBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import { WORKSPACE_PATH } from "./AgentSessionProvider";
import { useConversationStore } from "../store/conversationStore";

/**
 * Header shortcut to the conversations, from any page: one click back to the chats. Shows how many have
 * something new, and is marked while the workspace is the page. Hidden on phones, where the navigation
 * menu already lists it.
 */
export function ConversationsButton() {
  const { t } = useTranslation();
  const waiting = useConversationStore(
    (state) => Object.values(state.byId).filter((c) => c.unread > 0).length,
  );
  const active = Boolean(useMatch(WORKSPACE_PATH));
  const label = t("app-header.customer-conversation-view");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={WORKSPACE_PATH}
          aria-label={waiting > 0 ? `${label} (${waiting})` : label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative hidden size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground sm:grid",
            active && "bg-primary-soft text-primary hover:bg-primary-soft",
          )}
        >
          <MessagesSquare className="size-[19px]" strokeWidth={1.75} aria-hidden />
          {waiting > 0 && <UnreadBadge count={waiting} />}
        </Link>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
