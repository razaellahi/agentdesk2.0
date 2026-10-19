import { useEffect, useState } from "react";

/** Subscribe to a CSS media query (e.g. `(max-width: 1023px)`). */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof globalThis.matchMedia === "function" ? globalThis.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const media = globalThis.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
