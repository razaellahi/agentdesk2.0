import { getSession } from "@/core/auth";
import { t } from "@/core/i18n";
import type { TopicDataPayload } from "../model/conversation";
import { useConversationStore } from "../store/conversationStore";
import { useSchemaStore } from "../store/schemaStore";
import { topicParticipant } from "../session/commands";
import type { Conversation } from "../model/types";

/** Opens a local FAKE_CONVERSATION for outbound from phonebook (UA openCOnversationView). */
export function startConversationFromCustomer(customer: Conversation["customer"]) {
  const existing = Object.values(useConversationStore.getState().byId).find(
    (row) => row.customer._id && row.customer._id === customer._id,
  );
  if (existing) {
    useConversationStore.getState().setActive(existing.conversationId);
    return existing.conversationId;
  }

  const conversationId = crypto.randomUUID();
  const user = getSession().user!;
  const payload: TopicDataPayload = {
    conversationId,
    roomInfo: "FAKE_CONVERSATION",
    taskId: "",
    topicData: {
      customer,
      topicParticipant: topicParticipant(conversationId, "PRIMARY"),
    },
  };
  useConversationStore.getState().upsertFromTopicData(payload, {
    agentId: user.id,
    agentUsername: user.username,
    t,
    now: Date.now(),
    channelTypes: useSchemaStore.getState().channelTypes,
  });
  useConversationStore.getState().setActive(conversationId);
  return conversationId;
}
