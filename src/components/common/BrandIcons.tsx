import { useId, type ReactElement } from "react";

/**
 * The social and messaging channels as glyphs, drawn to the same weight as the line icons around them
 * (the icon set has no brand logos). Each is a coloured mark with no background of its own; the colours
 * are the --brand-* variables in tokens.css.
 */
type MarkProps = { className?: string };

const fill = (name: string) => ({ fill: `var(--brand-${name})` });
const stroke = (name: string) => ({ stroke: `var(--brand-${name})` });

function Facebook({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        style={fill("facebook")}
        d="M14 21v-7.5h2.6l.4-3.1h-3V8.6c0-.9.3-1.5 1.6-1.5H17V4.4c-.3 0-1.2-.1-2.3-.1-2.4 0-4 1.4-4 4.1v2H8v3.1h2.7V21H14z"
      />
    </svg>
  );
}

function Instagram({ className }: MarkProps) {
  const gradient = useId();
  const stop = (offset: string, name: string) => (
    <stop offset={offset} style={{ stopColor: `var(--brand-instagram-${name})` }} />
  );
  const paint = { stroke: `url(#${gradient})` };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0" y1="1" x2="1" y2="0">
          {stop("0", "yellow")}
          {stop("0.3", "orange")}
          {stop("0.65", "magenta")}
          {stop("1", "violet")}
        </linearGradient>
      </defs>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" strokeWidth="1.9" style={paint} />
      <circle cx="12" cy="12" r="4" fill="none" strokeWidth="1.9" style={paint} />
      <circle cx="17.2" cy="6.8" r="1.1" style={{ fill: `url(#${gradient})` }} />
    </svg>
  );
}

function WhatsApp({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="none"
        strokeWidth="1.9"
        strokeLinejoin="round"
        style={stroke("whatsapp")}
        d="M12 3.6a8.2 8.2 0 0 0-7.1 12.3L3.8 20.2l4.4-1.1A8.2 8.2 0 1 0 12 3.6z"
      />
      <path
        style={fill("whatsapp")}
        d="M15.9 13.9c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1l-.6.7c-.1.1-.2.2-.4.1-.7-.3-1.4-.8-1.9-1.4-.4-.5-.7-1-.8-1.2-.1-.2 0-.3.1-.4l.3-.3.2-.3c.1-.1 0-.3 0-.4l-.6-1.4c-.1-.3-.3-.3-.4-.3h-.4c-.1 0-.3 0-.5.3-.2.2-.7.7-.7 1.7s.7 2 .8 2.1c.1.1 1.4 2.2 3.4 3 .5.2.9.3 1.1.4.5.1.9.1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2z"
      />
    </svg>
  );
}

function Telegram({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        style={fill("telegram")}
        d="M3.6 11.2l15.7-6.1c.7-.3 1.4.2 1.1 1.3l-2.6 12.1c-.2.9-.7 1.1-1.4.7l-3.9-2.9-1.9 1.9c-.2.2-.4.4-.8.4l.3-4 7.3-6.6c.3-.3-.1-.4-.5-.2L7.7 13.6l-3.9-1.2c-.8-.3-.8-.8.2-1.2z"
      />
    </svg>
  );
}

function XTwitter({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        style={fill("x")}
        transform="translate(2.5 2.5) scale(0.79)"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

function LinkedIn({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        style={fill("linkedin")}
        d="M4.2 9.2h3.3v10.6H4.2zM5.85 3.9a1.95 1.95 0 1 1 0 3.9 1.95 1.95 0 0 1 0-3.9zM9.6 9.2h3.2v1.45c.5-.9 1.6-1.7 3.2-1.7 3.2 0 3.8 2.1 3.8 4.8v6.05h-3.3v-5.4c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8v5.5H9.6z"
      />
    </svg>
  );
}

function YouTube({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" strokeWidth="1.9" style={stroke("youtube")} />
      <path style={fill("youtube")} d="M10.2 9.3v5.4l4.6-2.7z" />
    </svg>
  );
}

const MARKS: Record<string, (props: MarkProps) => ReactElement> = {
  facebook: Facebook,
  instagram: Instagram,
  whatsapp: WhatsApp,
  telegram: Telegram,
  x: XTwitter,
  linkedin: LinkedIn,
  youtube: YouTube,
};

/** A social or messaging channel's glyph, by its brand key (see model/channelIcons). */
export function BrandIcon({ channel, className }: { channel: string; className?: string }) {
  const Mark = MARKS[channel];
  return Mark ? <Mark className={className} /> : null;
}
