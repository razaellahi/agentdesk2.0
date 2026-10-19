import { toast } from "sonner";
import { t } from "@/core/i18n";

/** Brief confirmation that realtime recovered after a drop (not shown on the first connect). */
export function notifyRealtimeConnected() {
  toast.success(t("workspace.realtime-reconnected"), {
    id: "realtime-connection",
    description: t("workspace.realtime-connected-hint"),
    duration: 3000,
  });
}
