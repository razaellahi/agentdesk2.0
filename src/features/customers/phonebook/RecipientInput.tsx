import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { cn } from "@/shared/lib/utils";

const split = (value: string) =>
  value
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Email recipients as chips, like a mail client: type or paste addresses, Enter / comma / space adds one,
 * Backspace on an empty field takes the last one back to edit. The value stays a comma-separated list.
 */
export function RecipientInput({
  id,
  value,
  onChange,
  disabled,
  autoFocusless,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Placeholder-free and compact (Cc / Bcc). */
  autoFocusless?: boolean;
}) {
  const [typing, setTyping] = useState("");
  const recipients = split(value);
  const commit = (text = typing) => {
    const added = split(text);
    if (added.length) onChange([...recipients, ...added.filter((item) => !recipients.includes(item))].join(", "));
    setTyping("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", ";", " ", "Tab"].includes(event.key) && typing.trim()) {
      if (event.key !== "Tab") event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && !typing && recipients.length) {
      event.preventDefault();
      const last = recipients.at(-1)!;
      onChange(recipients.slice(0, -1).join(", "));
      setTyping(last);
    }
  };
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 py-1.5">
      {recipients.map((recipient) => {
        const valid = looksLikeEmail(recipient);
        return (
          <span
            key={recipient}
            className={cn(
              "inline-flex max-w-full items-center gap-1 rounded-full py-0.5 ps-1 pe-1 text-[13px]",
              valid ? "bg-surface-2 text-foreground" : "bg-destructive-soft text-destructive-text",
            )}
            title={valid ? recipient : `${recipient} is not a valid email address`}
          >
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold uppercase",
                valid ? "bg-primary-soft text-primary" : "bg-destructive/15",
              )}
              aria-hidden
            >
              {recipient[0]}
            </span>
            <span className="truncate">{recipient}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove ${recipient}`}
              className="grid size-4 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
              onClick={() => onChange(recipients.filter((item) => item !== recipient).join(", "))}
            >
              <X className="size-3" />
            </button>
          </span>
        );
      })}
      <input
        id={id}
        value={typing}
        disabled={disabled}
        onChange={(event) => setTyping(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit()}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text");
          if (/[,;\s]/.test(text)) {
            event.preventDefault();
            commit(`${typing} ${text}`);
          }
        }}
        aria-invalid={recipients.some((item) => !looksLikeEmail(item))}
        placeholder={recipients.length || autoFocusless ? "" : "name@example.com"}
        className="h-7 min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
