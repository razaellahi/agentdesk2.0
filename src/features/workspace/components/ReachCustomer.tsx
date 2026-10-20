import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, CornerDownLeft, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/shared/lib/utils";
import type { useOutboundReach, ReachOption } from "../hooks/useOutboundReach";
import type { OutboundKind } from "../model/outboundPlan";
import { ChannelIcon, OutboundActionIcon } from "./ChannelIcon";

const ICON_TYPE: Record<OutboundKind, string> = {
  voice: "CX_VOICE",
  sms: "SMS",
  whatsapp: "WHATSAPP",
  email: "EMAIL",
  twitter: "TWITTER",
};

type Reach = ReturnType<typeof useOutboundReach>;

/**
 * "Reach customer": continue on a channel the customer is already on, or start a
 * new conversation on another one. Every unavailable channel says why, nothing
 * is offered that would fail, and destinations are masked per PII scope.
 */
export function ReachCustomer({
  reach,
  name,
  onDone,
  only,
  bare = false,
}: {
  reach: Reach;
  name: string;
  /** Limit to these channels (the Outbound tab shows voice/SMS with its own forms). */
  only?: OutboundKind[];
  /** Embedded in a panel: no title, scroll area or opt-out notice of its own. */
  bare?: boolean;
  /** Called after an action so the host can close itself. */
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const options = only ? reach.options.filter((o) => only.includes(o.kind)) : reach.options;
  const continuing = options.filter((o) => o.state === "continue");
  // A channel with no destination that the tenant rarely uses (X) is noise, so hide it.
  const starting = options.filter(
    (o) => o.state !== "continue" && !(o.kind === "twitter" && o.reason === "NO_DESTINATION"),
  );

  const usable = starting.filter((o) => o.state !== "unavailable");
  const blocked = starting.filter((o) => o.state === "unavailable");

  return (
    <div className={cn("flex flex-col", !bare && "max-h-[min(32rem,75vh)]")}>
      {!bare && (
        <div className="border-b border-border/60 px-3.5 py-2.5">
          <p className="truncate text-sm font-semibold">{t("workspace.reach.title", { name })}</p>
          <p className="text-xs text-muted-foreground">{t("workspace.reach.subtitle")}</p>
        </div>
      )}

      <div className={cn(!bare && "min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5")}>
        {reach.optedOut && !bare && (
          <p
            role="alert"
            className="m-1.5 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive-soft px-2.5 py-2 text-xs text-destructive-text"
          >
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("snackbar.Outbound-Blocked-Opt-Out")}
          </p>
        )}

        {continuing.length > 0 && (
          <Group label={t("workspace.reach.continue-heading")}>
            {continuing.map((option) => (
              <Row key={option.kind} option={option} reach={reach}>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 shrink-0 gap-1 px-2.5 text-xs"
                  onClick={() => {
                    reach.continueOn(option);
                    onDone();
                  }}
                >
                  <CornerDownLeft className="size-3" aria-hidden />
                  {t("workspace.reach.reply-here")}
                </Button>
              </Row>
            ))}
          </Group>
        )}

        {usable.length > 0 && !reach.optedOut && (
          <Group label={continuing.length ? t("workspace.reach.start-heading") : undefined}>
            {usable.map((option) => (
              <StartRow key={option.kind} option={option} reach={reach} onDone={onDone} />
            ))}
          </Group>
        )}

        {blocked.length > 0 && !reach.optedOut && (
          <details className="group/blocked px-1 pb-1">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground select-none hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
              <ChevronDown
                className="size-3.5 transition-transform group-open/blocked:rotate-180"
                aria-hidden
              />
              {t("workspace.reach.unavailable-heading", { count: blocked.length })}
            </summary>
            <ul className="space-y-0.5 pt-0.5">
              {blocked.map((option) => (
                <StartRow key={option.kind} option={option} reach={reach} onDone={onDone} />
              ))}
            </ul>
          </details>
        )}

        {!options.length && !bare && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t("workspace.reach.none")}</p>
        )}
      </div>
    </div>
  );
}

function Group({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <section className="py-1">
      {label && (
        <h3 className="px-2.5 pt-1 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </h3>
      )}
      <ul className="space-y-0.5">{children}</ul>
    </section>
  );
}

/** Shared row chrome: channel badge, name, detail line, trailing action. */
function Row({
  option,
  reach,
  detail,
  children,
}: {
  option: ReachOption;
  reach: Reach;
  detail?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const unavailable = option.state === "unavailable";
  return (
    <li
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2",
        unavailable ? "opacity-70" : "hover:bg-muted/60",
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center" aria-hidden>
        <ChannelIcon channelType={{ name: ICON_TYPE[option.kind] }} className="size-8" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{t(`workspace.reach.channel.${option.kind}`)}</p>
        <div className="truncate text-xs text-muted-foreground tabular-nums">
          {detail ??
            (unavailable
              ? reach.reasonText(option.reason, option.kind)
              : (option.sessionDisplay ?? option.targets[0]?.display ?? ""))}
        </div>
      </div>
      {children}
    </li>
  );
}

function StartRow({ option, reach, onDone }: { option: ReachOption; reach: Reach; onDone: () => void }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const target = option.targets[Math.min(index, option.targets.length - 1)];
  const busy = reach.busy === option.kind;
  const choose =
    option.state !== "unavailable" && option.targets.length > 1 ? (
      <Select value={String(index)} onValueChange={(value) => setIndex(Number(value))}>
        <SelectTrigger
          size="sm"
          aria-label={t("workspace.reach.pick-destination", {
            channel: t(`workspace.reach.channel.${option.kind}`),
          })}
          className="mt-0.5 h-6 w-full max-w-56 border-border/60 bg-transparent px-1.5 text-xs tabular-nums"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {option.targets.map((item, i) => (
            <SelectItem key={`${item.attrKey}:${item.value}`} value={String(i)} className="tabular-nums">
              {item.display}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : undefined;
  return (
    <Row option={option} reach={reach} detail={choose}>
      {option.state === "checking" && (
        <Loader2
          className="size-4 shrink-0 animate-spin text-muted-foreground"
          aria-label={t("workspace.reach.checking")}
        />
      )}
      {option.state === "ready" && target && (
        <Button
          type="button"
          size="sm"
          className="h-7 shrink-0 gap-1.5 px-2.5 text-xs"
          disabled={Boolean(reach.busy)}
          aria-busy={busy || undefined}
          onClick={() => {
            reach.start(option, target);
            // A call or X start runs here; composing opens its own sheet.
            onDone();
          }}
        >
          {busy ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : (
            <OutboundActionIcon kind={option.kind} className="size-3" />
          )}
          {t(`workspace.reach.action.${option.kind}`)}
        </Button>
      )}
    </Row>
  );
}
