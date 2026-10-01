import { useQuery } from "@tanstack/react-query";
import { getConfig } from "@/config";
import { fileEngineApi } from "@/core/api";

/**
 * File-engine media needs the agent's auth header, so it is fetched as a blob
 * and shown through an object URL (unified-agent safeMediaURL pipe). External
 * URLs are used as-is.
 */
export function useSecureMedia(url: string | undefined) {
  const isFileEngine = Boolean(url?.includes("/api/downloadFileStream"));
  const query = useQuery({
    queryKey: ["media", url],
    enabled: Boolean(url) && isFileEngine,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: 1,
    queryFn: async () => {
      const search = new URL(url!, globalThis.location.href).search;
      const blob = await fileEngineApi.get<Blob>(
        `${getConfig().FILE_SERVER_URL}/api/downloadFileStream${search}`,
        {},
        "blob",
      );
      return URL.createObjectURL(blob);
    },
  });
  return {
    src: isFileEngine ? query.data : url,
    loading: isFileEngine && query.isLoading,
    error: query.isError,
  };
}
