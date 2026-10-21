import type { QuickReply } from "../api";

const words = (term: string) => term.toLowerCase().split(/\s+/).filter(Boolean);

/** How well a reply fits one word: its tag first (exact, then start, then part of one), then its message. */
function fit(reply: QuickReply, word: string): number | null {
  const tags = reply.tags.map((tag) => tag.toLowerCase());
  if (tags.includes(word)) return 0;
  if (tags.some((tag) => tag.startsWith(word))) return 1;
  if (tags.some((tag) => tag.includes(word))) return 2;
  if (reply.message.toLowerCase().includes(word)) return 3;
  return null;
}

/**
 * The replies that fit what was typed, best first: every word has to be found in a tag or in the message,
 * and tag matches come before message matches. Typing nothing keeps the agent's own order. `tag` narrows to
 * the replies carrying it.
 */
export function filterQuickReplies(replies: QuickReply[], term: string, tag: string | null): QuickReply[] {
  const wanted = words(term);
  const chosen = tag?.toLowerCase();
  const scored = replies
    .filter((reply) => !chosen || reply.tags.some((item) => item.toLowerCase() === chosen))
    .map((reply, index) => {
      let score = 0;
      for (const word of wanted) {
        const one = fit(reply, word);
        if (one === null) return null;
        score += one;
      }
      return { reply, score, index };
    })
    .filter((row): row is { reply: QuickReply; score: number; index: number } => row !== null);
  return scored.sort((a, b) => a.score - b.score || a.index - b.index).map((row) => row.reply);
}

/** The tags in use, the most used first, for the filter chips. */
export function topTags(replies: QuickReply[], limit = 8): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const reply of replies)
    for (const tag of reply.tags) {
      const key = tag.toLowerCase();
      const row = counts.get(key);
      if (row) row.count++;
      else counts.set(key, { label: tag, count: 1 });
    }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((row) => row.label);
}

/** `text` cut into pieces, the ones that match a typed word marked, so the match can be shown. */
export function highlightParts(text: string, term: string): { text: string; match: boolean }[] {
  const found = words(term).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!found.length) return [{ text, match: false }];
  // Split with a capturing group: the pieces at odd positions are the matches.
  return text
    .split(new RegExp(`(${found.join("|")})`, "gi"))
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter((part) => part.text);
}

/** What the arrow keys, Enter, Tab and Escape do in the reply box while the slash list is open. */
export function slashKeyAction(
  event: { key: string; shiftKey: boolean },
  open: boolean,
  matchCount: number,
): "up" | "down" | "insert" | "close" | null {
  if (!open) return null;
  if (event.key === "ArrowDown" && matchCount) return "down";
  if (event.key === "ArrowUp" && matchCount) return "up";
  if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") return matchCount ? "insert" : null;
  if (event.key === "Escape") return "close";
  return null;
}
