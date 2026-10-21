import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/core/auth";
import { loadQuickReplies } from "../api";

/** The agent's saved quick replies: the query the panel, the slash list and the manager all share. */
export function useQuickReplies(enabled: boolean) {
  const user = useCurrentUser();
  const query = useQuery({
    queryKey: ["quick-replies", user?.id],
    enabled: enabled && Boolean(user?.id),
    queryFn: () => loadQuickReplies(user!.id),
  });
  return { replies: query.data?.replies ?? [], loading: query.isLoading, id: query.data?.id ?? null };
}
