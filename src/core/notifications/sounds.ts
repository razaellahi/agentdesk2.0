import { createLogger } from "@/core/logging/logger";

const log = createLogger("sounds");

type SoundName = "beep" | "ring" | "voiceRing";

const FILES: Record<SoundName, string> = {
  beep: "sounds/beep.mp3",
  ring: "sounds/ring.mp3",
  voiceRing: "sounds/call-ring.mp3",
};

const cache = new Map<SoundName, HTMLAudioElement>();
let muted = false;

function audio(name: SoundName) {
  let el = cache.get(name);
  if (!el) {
    el = new Audio(`${import.meta.env.BASE_URL}${FILES[name]}`);
    el.preload = "auto";
    cache.set(name, el);
  }
  return el;
}

function play(name: SoundName, loop = false) {
  if (muted) return;
  const el = audio(name);
  el.loop = loop;
  // Browsers reject play() before the first user gesture; that is expected, not an error.
  el.play().catch((error: unknown) => log.debug(`${name} blocked`, error));
}

function stop(name: SoundName) {
  const el = cache.get(name);
  if (!el) return;
  el.pause();
  el.currentTime = 0;
}

/** Notification sounds (unified-agent soundService). Rings loop until stopped. */
export const sounds = {
  beep: () => play("beep"),
  ring: () => play("ring", true),
  stopRing: () => stop("ring"),
  voiceRing: () => play("voiceRing", true),
  stopVoiceRing: () => stop("voiceRing"),
  setMuted(value: boolean) {
    muted = value;
    if (value) {
      stop("ring");
      stop("voiceRing");
    }
  },
};
