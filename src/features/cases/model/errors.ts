import { ApiError } from "@/core/api";

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** An unreachable case backend (network, 502/503…) reads as unavailability, not a raw gateway page. */
export function caseErrorMessage(error: Error, t: Translate): string {
  if (error instanceof ApiError && (error.isNetwork || error.status >= 500)) {
    return t("cases.conversation.unavailable", { status: error.status || "network" });
  }
  return error.message;
}
