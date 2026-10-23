import {
  CalendarClock,
  ChartNoAxesCombined,
  ClipboardCheck,
  Globe,
  Headset,
  Mail,
  MessageSquareText,
  Phone,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BrandIcon } from "@/components/common/BrandIcons";
import { BrandLogo } from "@/components/common/BrandLogo";
import { cn } from "@/shared/lib/utils";

/** The brand marks, drawn in white: their colours are variables, so this one wrapper turns them all white. */
const WHITE: CSSProperties = {
  "--brand-whatsapp": "white",
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

/** One stroke weight for every line icon in the illustration. */
const STROKE = 1.5;

/** Where pieces sit, as percent of the box from the centre: the channels' ring (not drawn) and the modules' ring. */
const CHANNEL_ORBIT = 26;
const MODULE_ORBIT = 44;

/** A point on an orbit at an angle (degrees, 0 = right, clockwise), as percent of the box. */
function onOrbit(radius: number, degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
}

/** How a piece breathes (see .desk-breathe): its drift, the length of one breath, where in it it starts. */
interface Breath {
  dx: string;
  dy: string;
  d: string;
  w: string;
}

/**
 * A piece of the illustration on its orbit: it breathes in place, and hovering nudges it outwards, away from
 * the headset at the middle.
 */
function Floating({
  x,
  y,
  breath,
  className,
  children,
}: {
  x: number;
  y: number;
  breath: Breath;
  className: string;
  children: ReactNode;
}) {
  const away = Math.hypot(x - 50, y - 50) || 1;
  const push = {
    "--px": `${(((x - 50) / away) * 10).toFixed(1)}px`,
    "--py": `${(((y - 50) / away) * 10).toFixed(1)}px`,
  };
  return (
    <span
      className={cn("desk-push absolute -translate-x-1/2 -translate-y-1/2", className)}
      style={{ left: `${x}%`, top: `${y}%`, ...push } as CSSProperties}
    >
      <span
        className="desk-breathe desk-glass grid size-full place-items-center rounded-full"
        style={{ "--dx": breath.dx, "--dy": breath.dy, "--d": breath.d, "--w": breath.w } as CSSProperties}
      >
        {children}
      </span>
    </span>
  );
}

const line = (Icon: LucideIcon) => <Icon className="size-[17px] text-white" strokeWidth={STROKE} />;
const brand = (channel: string) => (
  <White>
    <BrandIcon channel={channel} className="size-[17px]" />
  </White>
);

/** The channels the desk answers on: six, evenly on the inner orbit. */
const CHANNELS: { angle: number; breath: Breath; mark: ReactNode }[] = [
  { angle: 270, breath: { dx: "4px", dy: "6px", d: "7s", w: "-1s" }, mark: line(Phone) },
  { angle: 330, breath: { dx: "-5px", dy: "5px", d: "9s", w: "-4s" }, mark: line(MessageSquareText) },
  { angle: 30, breath: { dx: "-5px", dy: "-5px", d: "8s", w: "-2s" }, mark: brand("whatsapp") },
  { angle: 90, breath: { dx: "5px", dy: "-6px", d: "10s", w: "-6s" }, mark: line(Mail) },
  { angle: 150, breath: { dx: "6px", dy: "4px", d: "7.5s", w: "-3s" }, mark: brand("instagram") },
  { angle: 210, breath: { dx: "-4px", dy: "6px", d: "9.5s", w: "-5s" }, mark: line(Globe) },
];

/**
 * The rest of the suite, on the outer orbit's diagonals, each drawn as what it does so no words are needed: a
 * checklist for quality management, a calendar and clock for workforce management, a gear for admin and
 * configs, a chart for supervisor monitoring.
 */
const MODULES: { angle: number; breath: Breath; icon: LucideIcon }[] = [
  { angle: 225, breath: { dx: "4px", dy: "5px", d: "11s", w: "-2s" }, icon: ClipboardCheck },
  { angle: 315, breath: { dx: "-4px", dy: "5px", d: "12s", w: "-5s" }, icon: CalendarClock },
  { angle: 135, breath: { dx: "4px", dy: "-5px", d: "12.5s", w: "-7s" }, icon: Settings },
  { angle: 45, breath: { dx: "-4px", dy: "-5px", d: "11.5s", w: "-3s" }, icon: ChartNoAxesCombined },
];

/**
 * The sign-in page's left side: what the desk is for. A headset at the centre: the channels a contact centre
 * answers on evenly round it, and the rest of the suite (quality, workforce, admin, supervisor monitoring) on one
 * outer ring at the diagonals, joined to the centre by lines of tiny dots that fade out. Everything breathes
 * gently in place, and soft ripples leave the headset. Then the promise in words. Pure illustration, hidden
 * from assistive technology.
 */
export function LoginHero() {
  const { t } = useTranslation();
  return (
    <aside className="desk-login-hero hidden flex-col justify-between p-12 lg:flex xl:p-16" aria-hidden>
      <BrandLogo inverted className="h-9 w-auto self-start" />

      <div className="relative mx-auto my-6 aspect-square" style={{ width: "min(30rem, 100%, 52vh)" }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" fill="none" focusable="false">
          <defs>
            {MODULES.map(({ angle }) => {
              const from = onOrbit(13, angle);
              const to = onOrbit(MODULE_ORBIT - 7, angle);
              return (
                <linearGradient
                  key={angle}
                  id={`desk-spoke-${angle}`}
                  gradientUnits="userSpaceOnUse"
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                >
                  <stop offset="0" stopColor="white" stopOpacity="0.5" />
                  <stop offset="1" stopColor="white" stopOpacity="0.04" />
                </linearGradient>
              );
            })}
          </defs>
          <circle cx="50" cy="50" r={MODULE_ORBIT} stroke="white" strokeOpacity="0.12" strokeWidth="0.22" />
          {MODULES.map(({ angle }) => {
            const from = onOrbit(13, angle);
            const to = onOrbit(MODULE_ORBIT - 7, angle);
            return (
              <line
                key={angle}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={`url(#desk-spoke-${angle})`}
                strokeWidth="0.55"
                strokeLinecap="round"
                strokeDasharray="0 1.4"
              />
            );
          })}
        </svg>

        {[0, 1].map((ring) => (
          <span
            key={ring}
            className={cn(
              "desk-pulse absolute inset-[26%] rounded-full border border-white/45",
              ring === 1 && "desk-pulse-late",
            )}
          />
        ))}

        <span className="desk-glass absolute start-1/2 top-1/2 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full">
          <Headset className="size-10 text-white" strokeWidth={STROKE} />
        </span>

        {CHANNELS.map(({ angle, breath, mark }) => (
          <Floating key={angle} {...onOrbit(CHANNEL_ORBIT, angle)} breath={breath} className="size-10">
            {mark}
          </Floating>
        ))}

        {MODULES.map(({ angle, breath, icon: Icon }) => (
          <Floating key={angle} {...onOrbit(MODULE_ORBIT, angle)} breath={breath} className="size-16">
            <Icon className="size-7 text-white" strokeWidth={STROKE} />
          </Floating>
        ))}
      </div>

      <div>
        <h2 className="font-display text-3xl leading-[1.15] font-semibold tracking-[-0.025em] text-balance xl:text-[2.5rem]">
          {t("auth.hero-title-lead")}{" "}
          <span className="desk-gradient-text">{t("auth.hero-title-accent")}</span>
          <br />
          {t("auth.hero-title-rest")}
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/75">{t("auth.hero-subtitle")}</p>
      </div>
    </aside>
  );
}
