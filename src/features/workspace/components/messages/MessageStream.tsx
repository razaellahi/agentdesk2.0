import { Virtuoso } from "react-virtuoso";
import { useTranslation } from "react-i18next";
import { useDeskSettings } from "@/core/agent-settings";
import { getSession } from "@/core/auth";
import { lower } from "../../model/systemMessages";
import type { Conversation } from "../../model/types";
import { MessageRow } from "./MessageBody";

/** Virtualized, bottom-anchored transcript (one list, not one timer per row). */
export function MessageStream({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation();
  const formatting = useDeskSettings().messageFormatting;
  const me = getSession().user?.id;
  const messages = conversation.messages;

  if (!messages.length) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        {t("chat-features.interactions.start-of-conversation")}
      </p>
    );
  }

  return (
    <Virtuoso
      style={{ height: "100%" }}
      data={messages}
      followOutput="auto"
      initialTopMostItemIndex={messages.length - 1}
      itemContent={(_, message) => (
        <MessageRow
          message={message}
          conversation={conversation}
          formatting={formatting}
          mine={lower(message.header.sender?.type) === "agent" && message.header.sender?.id === me}
        />
      )}
    />
  );
}
