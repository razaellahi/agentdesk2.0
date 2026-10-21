import {
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Video,
  MonitorUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermission } from "@/core/auth";
import { formatDuration } from "@/core/i18n";
import { useMaskedValue } from "@/features/workspace";
import { useNow } from "@/shared/hooks/useNow";
import { useCallStore, type CallLeg } from "./callStore";
import { voiceCommand, placeOutboundVoice, type VoiceAction } from "./commands";
/**
 * Caller number as unified-agent call-controls shows it: in full with
 * customer:view_pii, otherwise through the manage_in_conversation masking pipe.
 */
function CallerNumber({ value }: { value: string }) {
  return <>{useMaskedValue(value, "voice", "manage_in_conversation", { preferViewPii: true })}</>;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export function CallDock() {
  const { t } = useTranslation();
  const call = useCallStore();
  const [expanded, setExpanded] = useState(false);
  const [number, setNumber] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationType, setDestinationType] = useState<"agent" | "queue" | "external">("agent");
  const [padLeg, setPadLeg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const transfer = usePermission("directTransfer");
  const consult = usePermission("consult");
  const conference = usePermission("conference");
  const record = usePermission("callRecordingControl");
  const now = useNow();
  if (!call.registered && call.phase === "idle" && !call.lastError) return null;
  const run = (action: VoiceAction, input: Parameters<typeof voiceCommand>[1] = {}) => {
    try {
      voiceCommand(action, input);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  const legControls = (leg: CallLeg, label: string) => (
    <div key={leg.id} className="rounded-lg border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium">
          {label}: <CallerNumber value={leg.peer ?? ""} />
        </span>
        <span className="text-muted-foreground tabular-nums">
          {leg.startedAt ? formatDuration(Math.floor((now - leg.startedAt) / 1000)) : leg.phase}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {leg.phase === "ringing" ? (
          <>
            <Button size="sm" onClick={() => run("answer", { dialogId: leg.id })}>
              {t("globals.accept")}
            </Button>
            {call.campaign && (
              <Button size="sm" variant="outline" onClick={() => run("skip", { dialogId: leg.id })}>
                {t("globals.skip")}
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={() => run("reject", { dialogId: leg.id })}>
              {t("globals.close")}
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={leg.phase === "dialing"}
              onClick={() => run(leg.phase === "held" ? "resume" : "hold", { dialogId: leg.id })}
            >
              {t(leg.phase === "held" ? "globals.resume" : "globals.hold")}
            </Button>
            {call.stack === "sip" && (
              <>
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label={t(leg.muted ? "globals.unMute" : "globals.mute")}
                  disabled={leg.phase !== "active"}
                  onClick={() => run(leg.muted ? "unmute" : "mute", { dialogId: leg.id })}
                >
                  {leg.muted ? <Mic /> : <MicOff />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={leg.phase !== "active"}
                  onClick={() => setPadLeg(padLeg === leg.id ? null : leg.id)}
                  aria-expanded={padLeg === leg.id}
                >
                  {t("globals.dialpad")}
                </Button>
              </>
            )}
            <Button
              size="icon-sm"
              variant="destructive"
              aria-label="End call"
              onClick={() => run("end", { dialogId: leg.id })}
            >
              <PhoneOff />
            </Button>
          </>
        )}
      </div>
      {padLeg === leg.id && leg.phase === "active" && (
        <div className="mt-3 grid grid-cols-3 gap-1">
          {KEYS.map((key) => (
            <Button
              key={key}
              variant="secondary"
              size="sm"
              onClick={() => run("dtmf", { dialogId: leg.id, digits: key })}
            >
              {key}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
  const showDetails = expanded || call.phase !== "idle" || Boolean(call.lastError);
  return (
    <section
      aria-label="Voice controls"
      className="fixed end-4 bottom-4 z-40 w-[min(25rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface shadow-lift transition-all"
    >
      <button
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-t-2xl px-3.5 py-2.5 text-start transition-colors hover:bg-surface-2"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={showDetails}
      >
        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          {call.phase === "ringing" ? (
            <PhoneIncoming className="size-4 animate-bounce text-primary" />
          ) : (
            <Phone className="size-4 text-primary" />
          )}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-medium tracking-tight">
          {call.peer ? (
            <CallerNumber value={call.peer} />
          ) : call.registered ? (
            "Voice connected"
          ) : (
            "Voice unavailable"
          )}
        </span>
        {call.recording === "started" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive-soft px-2 py-0.5 text-[11px] font-bold text-destructive-text">
            <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
            REC
          </span>
        )}
        {call.recording === "paused" && (
          <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning-text">
            REC paused
          </span>
        )}
        {showDetails ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="size-4 text-muted-foreground" />
        )}
      </button>
      {showDetails && (
        <div className="max-h-[70vh] space-y-3 overflow-auto border-t border-border/50 p-3.5">
          {call.lastError && (
            <div
              role="alert"
              className="flex items-start justify-between gap-2 rounded-lg bg-destructive-soft p-2 text-xs text-destructive-text"
            >
              {call.lastError}
              <button
                aria-label="Dismiss error"
                onClick={() => useCallStore.getState().patch({ lastError: null })}
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          {call.main &&
            legControls(call.main, call.conference ? "Conference" : call.campaign ? "Campaign" : "Customer")}
          {call.consult && legControls(call.consult, "Consult")}
          {call.consult && (
            <div className="flex gap-2">
              {transfer && (
                <Button
                  size="sm"
                  disabled={call.consult.phase !== "active"}
                  onClick={() => run("consultTransfer")}
                >
                  Complete transfer
                </Button>
              )}
              {conference && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={call.consult.phase !== "active"}
                  onClick={() => run("conference")}
                >
                  Conference
                </Button>
              )}
            </div>
          )}
          {call.main && !call.consult && ["active", "held"].includes(call.phase) && (transfer || consult) && (
            <div className="space-y-2">
              {call.stack === "sip" && (
                <label className="flex items-center gap-2 text-xs">
                  Destination type
                  <select
                    className="h-8 flex-1 rounded-md border bg-surface px-2"
                    value={destinationType}
                    onChange={(e) => setDestinationType(e.target.value as typeof destinationType)}
                  >
                    <option value="agent">Agent extension</option>
                    <option value="queue">Queue ID</option>
                    <option value="external">External number</option>
                  </select>
                </label>
              )}
              <Input
                aria-label="Transfer or consult destination"
                placeholder="Agent extension or destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
              <div className="flex gap-2">
                {transfer && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!destination.trim()}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: "Transfer call",
                          description: `Transfer this call to ${destination.trim()}?`,
                          confirmLabel: "Transfer",
                        })
                      )
                        run("transfer", {
                          number: destination.trim(),
                          destinationType: call.stack === "sip" ? destinationType : "agent",
                        });
                    }}
                  >
                    Transfer
                  </Button>
                )}
                {consult && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!destination.trim()}
                    onClick={() =>
                      run("consult", {
                        number: destination.trim(),
                        destinationType: call.stack === "sip" ? destinationType : "agent",
                      })
                    }
                  >
                    Consult
                  </Button>
                )}
              </div>
            </div>
          )}
          {call.stack === "sip" && call.main?.phase === "active" && (
            <div className="flex flex-wrap gap-1.5">
              {call.main.dialog.channelType?.toUpperCase() === "WEB_RTC" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => run("video", { on: !call.video })}>
                    <Video className="size-3" />
                    Video
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => run("screenShare", { on: !call.screenShare })}
                  >
                    <MonitorUp className="size-3" />
                    Share screen
                  </Button>
                </>
              )}
              {record && ["started", "paused"].includes(call.recording) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (
                      call.recording === "started" &&
                      !(await confirm({
                        title: "Pause recording",
                        description: "Pause the recording for this call?",
                        confirmLabel: "Pause",
                      }))
                    )
                      return;
                    run(call.recording === "paused" ? "resumeRecording" : "pauseRecording");
                  }}
                >
                  {call.recording === "paused" ? "Resume recording" : "Pause recording"}
                </Button>
              )}
            </div>
          )}
          {call.phase === "dialing" && !call.main && (
            <p role="status" className="text-xs text-muted-foreground">
              Dialing {call.peer}…
            </p>
          )}
          {call.phase === "idle" && call.registered && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setBusy(true);
                void placeOutboundVoice(number)
                  .then(() => setNumber(""))
                  .catch((error: Error) => toast.error(error.message))
                  .finally(() => setBusy(false));
              }}
            >
              <Input
                aria-label="Phone number"
                placeholder="Phone number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
              <Button size="icon" type="submit" disabled={busy || !number.trim()} aria-label="Call">
                <Phone className="size-4" />
              </Button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
