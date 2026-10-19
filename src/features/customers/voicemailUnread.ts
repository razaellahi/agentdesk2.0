import { useQuery } from "@tanstack/react-query";
import { conversationManagerApi } from "@/core/api";
import { searchActivitiesQuery } from "@/core/api/graphql";
import { useCurrentUser } from "@/core/auth";

/**
 * Unread voicemails addressed to the signed-in agent (unified-agent header
 * getInitialVoicemailCount / inbox getUnreadCount). Shares the ["voicemail"]
 * query prefix, so marking a voicemail read refreshes every badge.
 */
export function useUnreadVoicemailCount(enabled = true) {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["voicemail", "unread-count", user?.id],
    enabled: enabled && Boolean(user?.id),
    refetchInterval: 30_000,
    queryFn: async ({ signal }) => {
      try {
        const body = await conversationManagerApi.post<{
          errors?: { message: string }[];
          data?: { searchActivities?: { totalDocs?: number } };
        }>(
          "/graphql",
          {
            query: searchActivitiesQuery(
              [
                { key: "activity.name", operator: "equal_to", value: "VOICE_MAIL_ACTIVITY" },
                {
                  key: "activity.data.additionalDetails.agentInfo.agentId",
                  operator: "equal_to",
                  value: user!.id,
                },
                { key: "activity.data.additionalDetails.status", operator: "equal_to", value: "Unread" },
              ],
              1,
              0,
            ),
          },
          { signal },
        );
        if (body?.errors?.length) return 0;
        return body?.data?.searchActivities?.totalDocs ?? 0;
      } catch {
        return 0;
      }
    },
  });
}
