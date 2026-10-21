import type { ReactNode } from "react";
import { useSecondsLeft } from "@/shared/hooks/useNow";

/**
 * The seconds left until `deadline`, ticking each second. Only this spot re-renders on the tick, so the
 * screen around a timer is not redrawn every second.
 */
export function Countdown({
  deadline,
  children,
}: {
  deadline: number | null | undefined;
  children: (seconds: number) => ReactNode;
}) {
  const left = useSecondsLeft(deadline);
  return left === null ? null : <>{children(left)}</>;
}
