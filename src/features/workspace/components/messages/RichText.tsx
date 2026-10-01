import { Fragment, type ReactNode } from "react";

/**
 * Safe replacement for unified-agent's ibsformat + linkify pipes (which built
 * HTML strings for innerHTML). Produces React nodes only, so message text can
 * never inject markup.
 *   *bold*  _italic_  ~strike~  `code`  !highlight!   + auto-linked URLs
 */
const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/gi;
const FORMAT_RE = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`|![^!\n]+!)/g;

function linkify(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const url = match[0];
    out.push(
      <a
        key={`${key}-l${start}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-primary underline underline-offset-2"
      >
        {url}
      </a>,
    );
    last = start + url.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function formatted(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(FORMAT_RE)) {
    const start = match.index ?? 0;
    const token = match[0];
    // Markers must be word-bounded so "a*b*c" or snake_case words stay literal.
    const before = text[start - 1];
    const after = text[start + token.length];
    if ((before && /\w/.test(before)) || (after && /\w/.test(after))) continue;
    if (start > last) out.push(...linkify(text.slice(last, start), `${key}-${last}`));
    const inner = token.slice(1, -1);
    const k = `${key}-f${start}`;
    const marker = token[0];
    if (marker === "*") out.push(<strong key={k}>{inner}</strong>);
    else if (marker === "_") out.push(<em key={k}>{inner}</em>);
    else if (marker === "~") out.push(<s key={k}>{inner}</s>);
    else if (marker === "`")
      out.push(
        <code key={k} className="rounded bg-black/5 px-1 font-mono text-[0.9em] dark:bg-white/10">
          {inner}
        </code>,
      );
    else
      out.push(
        <mark key={k} className="rounded bg-warning-soft px-0.5 text-inherit">
          {inner}
        </mark>,
      );
    last = start + token.length;
  }
  if (last < text.length) out.push(...linkify(text.slice(last), `${key}-${last}`));
  return out;
}

export function RichText({ text, formatting = true }: { text: string; formatting?: boolean }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {formatting ? formatted(line, String(i)) : linkify(line, String(i))}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}
