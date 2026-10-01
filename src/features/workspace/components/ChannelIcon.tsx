import { useQuery } from "@tanstack/react-query";
import { AtSign, Globe, Mail, MessageCircle, MessageSquare, Phone, Share2, Store, Video } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { getChannelLogo, workspaceKeys } from "../api";
import type { ChannelType } from "../model/types";

const FALLBACK: Record<string, typeof Globe> = {
  web: Globe,
  whatsapp: MessageCircle,
  facebook: Share2,
  instagram: Share2,
  twitter: AtSign,
  youtube: Video,
  linkedin: Share2,
  email: Mail,
  sms: MessageSquare,
  play_store: Store,
  apple_store: Store,
  cx_voice: Phone,
  cisco_cc: Phone,
  web_rtc: Video,
};

/** Channel logo from the file engine (cached for the session), with an icon fallback. */
export function ChannelIcon({
  channelType,
  className,
}: {
  channelType?: ChannelType | null;
  className?: string;
}) {
  const logo = channelType?.channelLogo;
  const { data } = useQuery({
    queryKey: workspaceKeys.channelLogo(logo ?? ""),
    queryFn: () => getChannelLogo(logo!),
    enabled: Boolean(logo),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  const Fallback = FALLBACK[(channelType?.name ?? "").toLowerCase()] ?? MessageSquare;
  if (data)
    return (
      <img src={data} alt={channelType?.name ?? ""} className={cn("size-4 object-contain", className)} />
    );
  return <Fallback className={cn("size-4 text-medium", className)} aria-label={channelType?.name} />;
}
