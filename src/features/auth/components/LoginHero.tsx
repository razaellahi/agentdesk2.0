import { Globe, Headset, Mail, MessageSquareText, Phone, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BrandIcon } from "@/components/common/BrandIcons";
import { BrandLogo } from "@/components/common/BrandLogo";
import { cn } from "@/shared/lib/utils";

/** The brand marks, drawn in white: their colours are variables, so this one wrapper turns them all white. */
const WHITE: CSSProperties = {
  "--brand-facebook": "white",
  "--brand-linkedin": "white",
  "--brand-instagram-yellow": "white",
  "--brand-instagram-orange": "white",
  "--brand-instagram-magenta": "white",
  "--brand-instagram-violet": "white",
} as CSSProperties;

function White({ children }: { children: ReactNode }) {
  return (
    <span style={WHITE} className="grid place-items-center">
      {children}
    </span>
  );
}

/** The App Store's A in a rounded square, as a thin white line drawing like the icons around it. */
function AppStoreMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("text-white", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 7.2 8.2 15M12 7.2 15.8 15M9.4 12.6h5.2M7.4 16.6h2.6M14 16.6h2.6" />
    </svg>
  );
}

/** Google Play's triangle, as a thin white outline. */
function PlayStoreMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("text-white", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <path d="M6 4.2v15.6a.9.9 0 0 0 1.4.8l12-7.8a.9.9 0 0 0 0-1.6l-12-7.8A.9.9 0 0 0 6 4.2z" />
      <path d="M6.4 4.6 14 12l-7.6 7.4M14 12l2.6-2.6M14 12l2.6 2.6" />
    </svg>
  );
}

/**
 * A channel on a frosted tile, placed freely: `x` and `y` are percent of the box (the tile's centre), and
 * (dx, dy) / d / w give its breathing (see .desk-breathe), and hovering nudges it away from the headset.
 * Nothing here is on a ring.
 */
function Channel({
  x,
  y,
  dx,
  dy,
  d,
  w,
  children,
}: {
  x: number;
  y: number;
  dx: string;
  dy: string;
  d: string;
  w: string;
  children: ReactNode;
}) {
  // The push on hover points straight away from the headset at the middle of the box.
  const away = Math.hypot(x - 50, y - 50) || 1;
  const push = {
    "--px": `${(((x - 50) / away) * 12).toFixed(1)}px`,
    "--py": `${(((y - 50) / away) * 12).toFixed(1)}px`,
  };
  return (
    <span
      className="desk-push absolute size-11 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%`, ...push } as CSSProperties}
    >
      <span
        className="desk-breathe desk-glass grid size-full place-items-center rounded-xl"
        style={{ "--dx": dx, "--dy": dy, "--d": d, "--w": w } as CSSProperties}
      >
        {children}
      </span>
    </span>
  );
}

const icon = (Icon: LucideIcon) => <Icon className="size-5 text-white" strokeWidth={1.6} />;
const brand = (channel: string) => (
  <White>
    <BrandIcon channel={channel} className="size-5" />
  </White>
);

/**
 * Where each channel sits and how it breathes. They lie round the headset in an even circle, each one a touch
 * nearer or farther and a few degrees off its place, so it looks relaxed but tidy.
 */
const CHANNELS: { x: number; y: number; dx: string; dy: string; d: string; w: string; mark: ReactNode }[] = [
  { x: 51.7, y: 18, dx: "5px", dy: "7px", d: "7s", w: "-1s", mark: icon(Phone) },
  { x: 70, y: 22.5, dx: "-6px", dy: "5px", d: "9s", w: "-4s", mark: brand("facebook") },
  { x: 80.7, y: 45.7, dx: "-5px", dy: "-6px", d: "8s", w: "-2s", mark: brand("instagram") },
  { x: 79.4, y: 65, dx: "6px", dy: "-5px", d: "10s", w: "-6s", mark: icon(MessageSquareText) },
  { x: 58.5, y: 79.8, dx: "-7px", dy: "-4px", d: "7.5s", w: "-3s", mark: brand("linkedin") },
  { x: 39.5, y: 82.3, dx: "5px", dy: "6px", d: "9.5s", w: "-5s", mark: icon(Mail) },
  { x: 21.5, y: 64.5, dx: "7px", dy: "-5px", d: "8.5s", w: "-7s", mark: <AppStoreMark className="size-5" /> },
  {
    x: 17.2,
    y: 46,
    dx: "-5px",
    dy: "6px",
    d: "10.5s",
    w: "-2.5s",
    mark: <PlayStoreMark className="size-5" />,
  },
  { x: 30.9, y: 25.6, dx: "6px", dy: "7px", d: "7.8s", w: "-8s", mark: icon(Globe) },
];

/**
 * The sign-in page's left side: what the desk is for. A headset at the centre of soft ripples, with the
 * channels a contact centre answers on (voice, chat, email, web, Facebook, Instagram, LinkedIn and the two app
 * stores) scattered round it and breathing gently in place: no orbit, no spinning. Then the promise in words.
 * Pure illustration, hidden from assistive technology.
 */
export function LoginHero() {
  const { t } = useTranslation();
  return (
    <aside className="desk-login-hero hidden flex-col justify-between p-12 lg:flex xl:p-16" aria-hidden>
      <BrandLogo inverted className="h-9 w-auto self-start" />

      <div className="relative mx-auto my-8 aspect-square" style={{ width: "min(28rem, 100%, 54vh)" }}>
        {[0, 1].map((ring) => (
          <span
            key={ring}
            className={cn(
              "desk-pulse absolute inset-[18%] rounded-full border border-white/45",
              ring === 1 && "desk-pulse-late",
            )}
          />
        ))}

        <span className="desk-glass absolute start-1/2 top-1/2 grid size-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full">
          <Headset className="size-14 text-white" strokeWidth={1.4} />
        </span>

        {CHANNELS.map(({ mark, ...place }, index) => (
          <Channel key={index} {...place}>
            {mark}
          </Channel>
        ))}
      </div>

      <div>
        <h2 className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance xl:text-4xl">
          {t("auth.hero-title-lead")}{" "}
          <span className="desk-gradient-text">{t("auth.hero-title-accent")}</span>
          <br />
          {t("auth.hero-title-rest")}
        </h2>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/85">{t("auth.hero-subtitle")}</p>
      </div>
    </aside>
  );
}
