import { useCallback, useEffect, useState } from "react";

/**
 * `value`, once it has stopped changing for `delay` ms. `flush` settles it at once (Enter in a search box),
 * on the current value or on the one given (clearing the box).
 * The first value is settled from the start, so a page opened with a search already typed runs it straight away.
 */
export function useDebouncedValue<T>(value: T, delay: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    if (Object.is(value, settled)) return;
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, settled, delay]);
  const flush = useCallback((next: T = value) => setSettled(next), [value]);
  return [settled, flush] as const;
}
