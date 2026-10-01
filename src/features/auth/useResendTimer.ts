import { useCallback, useEffect, useState } from "react";

/** Countdown before "Resend" is enabled: 30 s for SMS, 60 s otherwise (as in unified-agent). */
export function useResendTimer(seconds: number) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  const start = useCallback(() => setRemaining(seconds), [seconds]);
  return { remaining, canResend: remaining <= 0, start };
}
