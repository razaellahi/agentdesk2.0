import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/core/api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Agents switch windows constantly; realtime data arrives over the socket instead.
      refetchOnWindowFocus: false,
      retry: (count, error) => {
        if (error instanceof ApiError && [400, 401, 403, 404, 422].includes(error.status)) return false;
        return count < 1;
      },
    },
    mutations: { retry: false },
  },
});
