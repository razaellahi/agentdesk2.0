import type { Conversation } from "../model/types";
import { channelIdentifierAttr } from "./linkCustomerWithTopic";
import { linkingChannelSession } from "./session";

export { isFakeConversation, linkingChannelSession } from "./session";

/** Build `/customers?q=linking…` for conversation ↔ phonebook (UA viewAllMatches / gotoEmbedView). */
export function phonebookLinkingPath(
  conversation: Conversation,
  options: { withChannelFilter?: boolean } = {},
) {
  const params = new URLSearchParams({
    q: "linking",
    conversationId: conversation.conversationId,
  });
  const topicId = conversation.customer._id;
  if (topicId) params.set("topicCustomerId", String(topicId));

  if (options.withChannelFilter) {
    const session = linkingChannelSession(conversation);
    const channelType = session?.channel.channelType.name;
    const channelIdentifier = session?.channelData.channelCustomerIdentifier;
    const attr = channelIdentifierAttr(channelType);
    if (attr && channelIdentifier) {
      params.set("filterKey", attr.key);
      params.set("filterLabel", attr.label);
      params.set("filterValue", channelIdentifier);
    }
  }

  return `/customers?${params.toString()}`;
}
