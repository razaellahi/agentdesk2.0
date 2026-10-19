import { getSession } from "@/core/auth";
import { socketManager } from "@/core/realtime";
import type { PullModeList } from "../store/pullModeStore";
import { usePullModeStore } from "../store/pullModeStore";

/** Subscribe to / unsubscribe from a pull-mode list (unified-agent subscribed-list toggle). */
export function setPullModeSubscription(list: PullModeList, on: boolean) {
  const user = getSession().user;
  if (!user) return;
  const current = usePullModeStore.getState().subscribed as PullModeList[];
  usePullModeStore
    .getState()
    .setSubscribed(
      on
        ? [...current.filter((item) => item.id !== list.id), list]
        : current.filter((item) => item.id !== list.id),
    );
  socketManager.emit(on ? "subscribePullModeList" : "unsubscribePullModeList", {
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
      conversationId: list.id,
      role: "PRIMARY",
      userCredentials: null,
      state: "SUBSCRIBED",
    },
    agentId: user.id,
    listId: list.id,
    list,
  });
}

/** Ends a waiting pull-mode request for everyone (needs subscribed-list:manage). */
export function endPullModeRequest(requestId: string) {
  socketManager.emit("deletePullModeRequest", requestId);
}
