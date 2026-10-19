import { createLogger } from "@/core/logging/logger";

const log = createLogger("spellcheck");

/** Languages with bundled dictionaries (public/dictionaries/<code>). */
export const DICTIONARY_LANGUAGES = ["en", "fr", "ger"];

type Pending = { resolve: (value: never) => void };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
let loaded: { lang: string; ok: Promise<boolean> } | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./spellcheck.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ id: number }>) => {
      const p = pending.get(event.data.id);
      if (!p) return;
      pending.delete(event.data.id);
      p.resolve(event.data as never);
    };
    worker.onerror = (error) => log.warn("worker error", error);
  }
  return worker;
}

function call<T>(message: Record<string, unknown>): Promise<T> {
  const id = nextId++;
  return new Promise<T>((resolve) => {
    pending.set(id, { resolve: resolve as (value: never) => void });
    getWorker().postMessage({ ...message, id });
  });
}

/** Loads the dictionary for a desk language; resolves false when none exists. */
export function loadDictionary(lang: string): Promise<boolean> {
  if (!DICTIONARY_LANGUAGES.includes(lang)) {
    loaded = { lang, ok: Promise.resolve(false) };
    return loaded.ok;
  }
  if (loaded?.lang === lang) return loaded.ok;
  const ok = call<{ ok: boolean }>({ type: "load", lang, baseUrl: import.meta.env.BASE_URL }).then(
    (r) => r.ok,
  );
  loaded = { lang, ok };
  return ok;
}

export async function findMisspelled(words: string[]): Promise<Set<string>> {
  if (!words.length) return new Set();
  const unique = [...new Set(words)];
  const res = await call<{ misspelled: string[] }>({ type: "check", words: unique });
  return new Set(res.misspelled);
}

export async function suggest(word: string): Promise<string[]> {
  const res = await call<{ suggestions: string[] }>({ type: "suggest", word });
  return res.suggestions;
}
