import { ConversationPane } from "./components/ConversationPane";
import { ConversationRail } from "./components/ConversationRail";
import { useActiveConversationId } from "./store/conversationStore";

/** Agent workspace: conversation list and the open conversation. */
export default function ConversationsPage() {
  const activeId = useActiveConversationId();
  return (
    <div className="flex h-full min-h-0 gap-3 p-3">
      <ConversationRail />
      <ConversationPane conversationId={activeId} />
    </div>
  );
}
