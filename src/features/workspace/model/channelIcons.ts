import {
  AtSign,
  Send,
  Globe,
  Headset,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Smartphone,
  Video,
  type LucideIcon,
} from "lucide-react";

/** How a channel is drawn: its logo for social and messaging channels, else a coloured badge. */
export type ChannelLook =
  { kind: "brand"; brand: string } | { kind: "badge"; Icon: LucideIcon; tone: string };

/** Coloured badges for the channels without a logo; each keeps one colour everywhere it appears. */
const BADGES: [RegExp, LucideIcon, string][] = [
  [/email|mail/, Mail, "text-amber-600 dark:text-amber-400"],
  [/cx_voice|cisco_cc|voice|call/, Headset, "text-indigo-600 dark:text-indigo-400"],
  [/web_rtc|video/, Video, "text-violet-600 dark:text-violet-400"],
  [/sms/, MessageSquare, "text-teal-600 dark:text-teal-400"],
  [/web|site|browser/, Globe, "text-sky-600 dark:text-sky-400"],
  [/store|app/, Smartphone, "text-slate-600 dark:text-slate-300"],
  [/phone|mobile/, Phone, "text-emerald-600 dark:text-emerald-400"],
  [/chat|viber/, MessageCircle, "text-emerald-600 dark:text-emerald-400"],
  [/handle|id$/, AtSign, "text-sky-600 dark:text-sky-400"],
];

/** The brand logos, most specific name first (Messenger is Facebook's). */
const BRANDS: [RegExp, string][] = [
  [/facebook|messenger/, "facebook"],
  [/instagram/, "instagram"],
  [/whatsapp/, "whatsapp"],
  [/telegram/, "telegram"],
  [/linkedin/, "linkedin"],
  [/youtube/, "youtube"],
  [/twitter|^x$/, "x"],
];

/** The look of a channel (WHATSAPP, EMAIL, CX_VOICE...) or an identifier label ("Phone number"). */
export function channelLook(name: string): ChannelLook {
  const key = name.toLowerCase();
  const brand = BRANDS.find(([pattern]) => pattern.test(key));
  if (brand) return { kind: "brand", brand: brand[1] };
  const badge = BADGES.find(([pattern]) => pattern.test(key));
  if (badge) return { kind: "badge", Icon: badge[1], tone: badge[2] };
  return { kind: "badge", Icon: Send, tone: "bg-slate-500/15 text-slate-600 dark:text-slate-300" };
}
