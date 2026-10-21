import { useQuery } from "@tanstack/react-query";
import { getConfig } from "@/config";
import { fileEngineApi, vrsApi } from "@/core/api";
import { getSession } from "@/core/auth";
import { resolveRecordingUrl } from "@/features/recordings";

/**
 * File-engine media needs the agent's auth header, so it is fetched as a blob
 * and shown through an object URL (unified-agent safeMediaURL pipe). External
 * URLs are used as-is.
 */
export function useSecureMedia(url: string | undefined) {
  const isFileEngine = Boolean(url?.includes("/api/downloadFileStream"));
  const isRecording = Boolean(url && /\/(?:vrs\/)?(?:recording|stream)\//.test(url));
  const authenticated = isFileEngine || isRecording;
  const safeExternalUrl = url && /^(https?:\/\/|\/)/i.test(url) ? url : undefined;
  const query = useQuery({
    queryKey: ["media", getSession().user?.id, url],
    enabled: Boolean(url) && authenticated,
    // The object URL is what is cached, so a row that scrolls back into view shows its picture at once
    // instead of going through a loading state of another height (which makes the transcript jump).
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: 1,
    queryFn: async () => {
      if (isRecording)
        return URL.createObjectURL(
          await vrsApi.get<Blob>(
            resolveRecordingUrl(url!, getSession().user?.username ?? ""),
            { tenantHeader: getConfig().VRS_TENANT_HEADER },
            "blob",
          ),
        );
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
    src: authenticated ? query.data : safeExternalUrl,
    loading: authenticated && query.isLoading,
    error: query.isError,
  };
}
