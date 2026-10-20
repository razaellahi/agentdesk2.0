/** Large, light illustration for "no conversation selected" (two chat bubbles). */
export function EmptyConversationArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} role="img" aria-hidden focusable="false">
      <rect x="54" y="58" width="104" height="54" rx="18" className="fill-primary/25" />
      <path d="M72 112 L62 128 L90 112 Z" className="fill-primary/25" />
      <rect x="92" y="84" width="104" height="48" rx="16" className="fill-primary/15" />
      <path d="M170 132 L182 146 L154 132 Z" className="fill-primary/15" />
      <circle cx="82" cy="85" r="4" className="fill-primary/60" />
      <circle cx="102" cy="85" r="4" className="fill-primary/60" />
      <circle cx="122" cy="85" r="4" className="fill-primary/60" />
      <rect x="116" y="104" width="54" height="5" rx="2.5" className="fill-primary/30" />
      <rect x="116" y="116" width="36" height="5" rx="2.5" className="fill-primary/30" />
    </svg>
  );
}
