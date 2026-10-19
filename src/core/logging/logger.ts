/* eslint-disable no-console -- this module is the single sanctioned console sink */
type Level = "debug" | "info" | "warn" | "error" | "silent";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

let threshold: Level = import.meta.env.DEV ? "debug" : "warn";

export function setLogLevel(level: Level): void {
  threshold = level;
}

const SECRET_KEYS = /pass(word)?|token|secret|otp|authorization|ctiParam|extStatic/i;

/** Masks credential-like fields so secrets never reach the console or a reporter. */
export function redact(value: unknown, depth = 0): unknown {
  // An Error has no enumerable fields; copying it would log an empty object.
  if (value instanceof Error) return value;
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, v]) => [
      key,
      SECRET_KEYS.test(key) ? "[redacted]" : redact(v, depth + 1),
    ]),
  );
}

function emit(level: Exclude<Level, "silent">, scope: string, message: string, data: unknown[]) {
  if (ORDER[level] < ORDER[threshold]) return;
  const args = [`[${scope}] ${message}`, ...data.map((d) => redact(d))];
  if (level === "debug") console.debug(...args);
  else if (level === "info") console.info(...args);
  else if (level === "warn") console.warn(...args);
  else console.error(...args);
}

export interface Logger {
  debug(message: string, ...data: unknown[]): void;
  info(message: string, ...data: unknown[]): void;
  warn(message: string, ...data: unknown[]): void;
  error(message: string, ...data: unknown[]): void;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (message, ...data) => emit("debug", scope, message, data),
    info: (message, ...data) => emit("info", scope, message, data),
    warn: (message, ...data) => emit("warn", scope, message, data),
    error: (message, ...data) => emit("error", scope, message, data),
  };
}
