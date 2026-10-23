/**
 * "No conversation open": a short list of conversation slips, each with its channel spine, and one of them
 * lifted out of the stack, as the open conversation is lifted out of the list.
 */
export function EmptyConversationArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} role="img" aria-hidden focusable="false">
      {[0, 1, 2].map((row) => (
        <g key={row} transform={`translate(34 ${28 + row * 40})`} opacity={row === 1 ? 0 : 1}>
          <rect width="172" height="30" rx="8" className="fill-chat-rule/35" />
          <rect width="3" height="30" rx="1.5" className="fill-chat-rule" />
          <circle cx="22" cy="15" r="7" className="fill-chat-rule/70" />
          <rect x="38" y="8" width={row === 0 ? 70 : 54} height="5" rx="2.5" className="fill-chat-rule/80" />
          <rect x="38" y="18" width={row === 0 ? 104 : 88} height="4" rx="2" className="fill-chat-rule/50" />
        </g>
      ))}
      <g transform="translate(26 62)">
        <rect width="188" height="38" rx="10" className="fill-surface stroke-chat-rule" strokeWidth="1.5" />
        <rect x="0" y="0" width="4" height="38" rx="2" className="fill-primary" />
        <circle cx="26" cy="19" r="9" className="fill-chat-avatar" />
        <rect x="46" y="10" width="64" height="6" rx="3" className="fill-chat-ink/80" />
        <rect x="46" y="22" width="108" height="5" rx="2.5" className="fill-chat-rule" />
        <circle cx="172" cy="19" r="5" className="fill-primary" />
      </g>
    </svg>
  );
}
