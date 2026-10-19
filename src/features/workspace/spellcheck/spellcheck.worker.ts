/// <reference lib="webworker" />
import nspell from "nspell";

/**
 * Dictionary spell checking off the main thread (unified-agent SpellcheckService
 * used nspell on the UI thread). One dictionary is active at a time.
 */
type Request =
  | { id: number; type: "load"; lang: string; baseUrl: string }
  | { id: number; type: "check"; words: string[] }
  | { id: number; type: "suggest"; word: string };

let spell: ReturnType<typeof nspell> | null = null;
let currentLang: string | null = null;
const cache = new Map<string, boolean>();

async function load(lang: string, baseUrl: string): Promise<boolean> {
  if (lang === currentLang) return spell !== null;
  currentLang = lang;
  spell = null;
  cache.clear();
  try {
    const [aff, dic] = await Promise.all(
      ["index.aff", "index.dic"].map(async (file) => {
        const res = await fetch(`${baseUrl}dictionaries/${lang}/${file}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      }),
    );
    if (currentLang !== lang) return false; // superseded by a newer load
    spell = nspell(aff!, dic!);
    return true;
  } catch {
    return false;
  }
}

function isCorrect(word: string): boolean {
  if (!spell) return true;
  const hit = cache.get(word);
  if (hit !== undefined) return hit;
  // Accept a lower-cased form too, so sentence-initial capitals are not flagged.
  const ok = spell.correct(word) || spell.correct(word.toLowerCase());
  if (cache.size > 5000) cache.clear();
  cache.set(word, ok);
  return ok;
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const msg = event.data;
  if (msg.type === "load") {
    const ok = await load(msg.lang, msg.baseUrl);
    self.postMessage({ id: msg.id, ok });
  } else if (msg.type === "check") {
    self.postMessage({ id: msg.id, misspelled: msg.words.filter((w) => !isCorrect(w)) });
  } else if (msg.type === "suggest") {
    self.postMessage({ id: msg.id, suggestions: spell ? spell.suggest(msg.word).slice(0, 6) : [] });
  }
};
