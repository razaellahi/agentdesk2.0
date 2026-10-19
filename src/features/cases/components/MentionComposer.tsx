import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { cn } from "@/shared/lib/utils";
import { fetchMentionTargets, type MentionTarget } from "../api";

export interface MentionComposerHandle {
  clear(): void;
  focus(): void;
}

/** Stored comment syntax: @[Label](userId) / @[Label](group:groupId). */
function mentionToken(target: MentionTarget): string {
  return target.kind === "GROUP"
    ? `@[${target.label}](group:${encodeURIComponent(target.id)})`
    : `@[${target.label}](${target.id})`;
}

function serialize(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  const token = node.dataset.mentionToken;
  if (token) return token;
  if (node.tagName === "BR") return "\n";
  const text = Array.from(node.childNodes).map(serialize).join("");
  return node.tagName === "DIV" || node.tagName === "P" ? `${text}\n` : text;
}

/** The "@query" being typed right before the caret, if any. */
function currentMention(): { query: string; range: Range } | null {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE) return null;
  const node = range.startContainer;
  const before = (node.textContent ?? "").slice(0, range.startOffset);
  const at = before.lastIndexOf("@");
  if (at < 0 || (at > 0 && /\S/.test(before.charAt(at - 1)))) return null;
  const query = before.slice(at + 1);
  if (query.includes(" ") || query.includes("]")) return null;
  const mentionRange = document.createRange();
  mentionRange.setStart(node, at);
  mentionRange.setEnd(node, range.startOffset);
  return { query, range: mentionRange };
}

function placeCaretAfter(node: Node) {
  const selection = globalThis.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertPlainText(editor: HTMLElement, text: string) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
    editor.append(document.createTextNode(text));
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  placeCaretAfter(node);
}

/**
 * Plain-text note editor with @mentions of users and routing groups (case activity
 * compose). Mentions render as non-editable chips and serialize to tokens.
 */
export function MentionComposer({
  ref,
  id,
  placeholder,
  disabled,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  ref?: Ref<MentionComposerHandle>;
  id?: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (body: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const mentionRange = useRef<Range | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);
  const [results, setResults] = useState<MentionTarget[]>([]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [empty, setEmpty] = useState(true);

  const sync = () => {
    const body = editor.current ? serialize(editor.current) : "";
    setEmpty(!body.trim() && !editor.current?.querySelector("[data-mention-token]"));
    onChange(body);
  };

  useImperativeHandle(ref, () => ({
    clear() {
      editor.current?.replaceChildren();
      setOpen(false);
      setEmpty(true);
      onChange("");
    },
    focus() {
      editor.current?.focus();
    },
  }));

  const search = (query: string) => {
    const seq = ++searchSeq.current;
    fetchMentionTargets(query)
      .then((targets) => {
        if (seq !== searchSeq.current) return;
        setResults(targets);
        setIndex(0);
        setOpen(targets.length > 0);
      })
      .catch(() => setOpen(false));
  };

  const onInput = () => {
    sync();
    const mention = currentMention();
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!mention) {
      mentionRange.current = null;
      setOpen(false);
      return;
    }
    mentionRange.current = mention.range;
    if (!mention.query) search("");
    else searchTimer.current = setTimeout(() => search(mention.query), 200);
  };

  const insertMention = (target: MentionTarget) => {
    const range = mentionRange.current?.cloneRange();
    if (range && editor.current) {
      range.deleteContents();
      const chip = document.createElement("span");
      chip.textContent = `@${target.label}`;
      chip.contentEditable = "false";
      chip.dataset.mentionToken = mentionToken(target);
      chip.className =
        "mx-px inline-flex rounded bg-primary-soft px-1 font-medium whitespace-nowrap text-primary";
      const space = document.createTextNode(" ");
      range.insertNode(space);
      range.insertNode(chip);
      placeCaretAfter(space);
    } else if (editor.current) {
      insertPlainText(editor.current, `@${target.label} `);
    }
    mentionRange.current = null;
    setOpen(false);
    setResults([]);
    sync();
  };

  return (
    <div className="relative">
      <div
        ref={editor}
        id={id}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel ?? placeholder}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        data-empty={empty || undefined}
        className={cn(
          "max-h-40 min-h-16 overflow-y-auto rounded-lg border border-border bg-surface px-3 py-2 text-sm whitespace-pre-wrap outline-none focus-visible:border-primary",
          "data-[empty]:before:pointer-events-none data-[empty]:before:text-muted-foreground data-[empty]:before:content-[attr(data-placeholder)]",
          disabled && "opacity-60",
          className,
        )}
        onInput={onInput}
        onKeyDown={(event) => {
          if (!open) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIndex((i) => Math.min(i + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setIndex((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter" && results[index]) {
            event.preventDefault();
            insertMention(results[index]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        onPaste={(event) => {
          event.preventDefault();
          if (editor.current) insertPlainText(editor.current, event.clipboardData.getData("text/plain"));
          sync();
        }}
      />
      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute bottom-full z-30 mb-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {results.map((target, i) => (
            <li key={`${target.kind}:${target.id}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === index}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-surface-2",
                  i === index && "bg-surface-2",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention(target);
                }}
              >
                <span className="truncate">{target.label}</span>
                {target.description && (
                  <span className="shrink-0 text-xs text-muted-foreground">{target.description}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
