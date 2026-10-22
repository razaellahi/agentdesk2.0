/** Agent workspace public surface. The page is lazy; shell pieces are static. */
export { AgentSessionProvider } from "./components/AgentSessionProvider";
export { InactivityBanner } from "./components/InactivityBanner";
export { ConnectionStatusHost } from "./components/ConnectionStatusHost";
export { AgentStateMenu } from "./components/AgentStateMenu";
export { RequestCenter } from "./components/RequestCenter";
export { QuickLinksMenu } from "./components/QuickLinksMenu";
export { ConversationsButton } from "./components/ConversationsButton";
export { OutboundPanel } from "./components/OutboundPanel";
export { AgentAnnouncementsMenu } from "./components/AgentAnnouncementsMenu";
export { LinkConversationHost } from "./components/LinkConversationDialog";
export { ConversationPopoutHost } from "./components/ConversationPopoutHost";
export { HistoryDialog } from "./components/HistoryDialog";

export const ConversationsPage = () => import("./ConversationsPage");

export { maskPii } from "./model/pii";
export { useMaskedValue } from "./hooks/useMaskedValue";
export { useSecureMedia } from "./components/messages/useSecureMedia";
export type { SchemaAttribute } from "./api";
export type { Conversation, ChannelSession } from "./model/types";
export { WORKSPACE_PATH } from "./components/AgentSessionProvider";
export { openLinkConversationDialog } from "./linking/linkDialog";
export { linkCustomerWithTopic } from "./linking/linkCustomerWithTopic";
export { startConversationFromCustomer } from "./linking/startConversation";
export { refreshConversationCustomer } from "./linking/refreshCustomer";
export { useConversationStore, getConversation } from "./store/conversationStore";
export { useSchemaStore } from "./store/schemaStore";
export { isFakeConversation } from "./linking/session";
export {
  channelDisplayLabel,
  getOutboundFromChannels,
  sendOutboundSms,
  startOutboundSms,
  shouldBlockOutbound,
  type OutboundChannel,
} from "./api/outbound";
export { prepareVoiceMrd, restoreVoiceMrd, forgetVoiceMrd } from "./session/voiceMrd";
export { ChannelCluster, OutboundActionIcon } from "./components/ChannelIcon";
export { channelTypeNames } from "./model/channelIcons";
export { onSessionEvent } from "./session/agentSession";
export { RefinedPreview, RefineWorking } from "./components/RefineAssist";
export { refineText } from "./api";
export { cxVoiceSessionOf } from "./model/participants";

export { useAgentStore } from "./store/agentStore";
export { sendColdOutbound } from "./session/coldOutbound";
export { escapeEmailText, validEmailRecipients } from "./model/email";
export type { InlineEmailImage } from "./model/email";
export { EmailEditor } from "./components/email/EmailEditor";
export { useSpelling } from "./spellcheck/useSpelling";
export { sanitizeEmailHtml, revokeInlineImages } from "./model/emailEditor";
export type { AgentPresence } from "./store/agentStore";
export { useBoardWantsRoom } from "./store/boardStore";
export { usePullModeStore, type PullModeList } from "./store/pullModeStore";
export { setPullModeSubscription, endPullModeRequest } from "./session/pullMode";
export { joinPullModeRequest } from "./session/commands";
