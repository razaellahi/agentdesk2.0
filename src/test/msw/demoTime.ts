/** One clock for the mock backend, so history timestamps and case link times line up in the demo. */
export const DEMO_NOW = Date.now();

const MINUTE = 60_000;

/** Epoch milliseconds, `minutes` before the demo clock. */
export const minutesAgo = (minutes: number) => DEMO_NOW - minutes * MINUTE;

/** The same moment as an ISO string (how Case Management stores it). */
export const isoMinutesAgo = (minutes: number) => new Date(minutesAgo(minutes)).toISOString();
