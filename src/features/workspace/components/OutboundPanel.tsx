import { ArrowLeft, Send, Grid3X3, Loader2, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { IconTooltip } from "@/components/common/IconTooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDeskSettings } from "@/core/agent-settings";
import { getSession, useCurrentUser, usePermission } from "@/core/auth";
import { listCustomers, type CustomerRow } from "@/features/customers";
import { placeOutboundVoice, useCallStore } from "@/features/voice";
import { channelDisplayLabel, getOutboundFromChannels, startOutboundSms } from "../api/outbound";
import { useMaskedValue } from "../hooks/useMaskedValue";
import { formatSmsNumber, validSmsNumber } from "../model/outbound";
import { useActiveConversationId, useConversationStore } from "../store/conversationStore";
import { ChannelIcon, OutboundActionIcon } from "./ChannelIcon";

function asPhoneList(value: unknown): string[] {
  if (Array.isArray(value))
    return value
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** One way of reaching the number: channel logo, what it does, and its button (same look as Reach customer). */
function ChannelRow({
  kind,
  label,
  hint,
  extra,
  children,
}: {
  kind: "CX_VOICE" | "SMS";
  label: string;
  hint: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg px-1 py-2 hover:bg-muted/60">
      <span className="grid size-8 shrink-0 place-items-center" aria-hidden>
        <ChannelIcon channelType={{ name: kind }} className="size-8" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground tabular-nums">{hint}</p>
        {extra}
      </div>
      {children}
    </div>
  );
}

function CustomerOption({
  customer,
  selected,
  onSelect,
}: {
  customer: CustomerRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const name = useMaskedValue(
    [customer.firstName, customer.lastName].filter(Boolean).join(" "),
    "firstName",
    "manage",
  );
  const phone = useMaskedValue(customer.phoneNumber ?? customer.voice, "phoneNumber", "manage");
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted ${selected ? "bg-primary-soft" : ""}`}
      onClick={onSelect}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{name || t("globals.UNIDENTIFIED-CUSTOMER")}</span>
        <span className="block truncate text-xs text-muted-foreground">{phone}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  );
}

/** Header outbound: customer search, voice dial strings and prefix-aware SMS with retained failure drafts. */
export function OutboundPanel() {
  const { t } = useTranslation();
  const settings = useDeskSettings();
  const user = useCurrentUser();
  const permitted = usePermission("agentSession");
  const canInitiate = usePermission("initiateChat");
  const hasChannels = settings.outboundSms || settings.cxVoice || settings.cisco;
  const registered = useCallStore((s) => s.registered);
  const callPhase = useCallStore((s) => s.phase);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [sms, setSms] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialPad, setDialPad] = useState(false);
  /** Channel list first; the message form only opens once Text is chosen. */
  const [composing, setComposing] = useState(false);
  // However the panel closes (outside click, Call, send-and-close), it reopens on the channel list.
  const setPanelOpen = (next: boolean) => {
    setOpen(next);
    if (!next) setComposing(false);
  };
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [smsFrom, setSmsFrom] = useState("");
  const [voiceFrom, setVoiceFrom] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const activeId = useActiveConversationId();
  const activeConversation = useConversationStore((s) => (activeId ? s.byId[activeId] : null));
  const activeCustomer = activeConversation?.customer;
  const activePhones = activeCustomer
    ? [
        ...asPhoneList(activeCustomer.phoneNumber),
        ...asPhoneList(activeCustomer.phone),
        ...asPhoneList(activeCustomer.voice),
      ].filter((v, i, a) => a.indexOf(v) === i)
    : [];
  const activePhone = activePhones[0] ?? "";
  const activeName = [activeCustomer?.firstName, activeCustomer?.lastName].filter(Boolean).join(" ");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(phone.trim()), 300);
    return () => clearTimeout(timer);
  }, [phone]);
  const matches = useQuery({
    queryKey: ["outbound-customer-matches", user?.id, search],
    queryFn: () => listCustomers(25, 0, search, { field: "phoneNumber" }),
    enabled: open && permitted && search.length > 2,
    staleTime: 10_000,
  });
  const smsChannels = useQuery({
    queryKey: ["outbound-channels", user?.id, "SMS"],
    queryFn: () => getOutboundFromChannels("SMS"),
    enabled: open && permitted && settings.outboundSms,
  });
  const voiceChannels = useQuery({
    queryKey: ["outbound-channels", user?.id, "CX_VOICE"],
    queryFn: () => getOutboundFromChannels("CX_VOICE"),
    enabled: open && permitted && (settings.cxVoice || settings.cisco),
  });
  const selectedSmsFrom = smsFrom || smsChannels.data?.selected || "";
  const selectedVoiceFrom = voiceFrom || voiceChannels.data?.selected || "";
  const matchedCustomer =
    customer ?? (matches.data?.docs.length === 1 && search === phone.trim() ? matches.data.docs[0]! : null);
  const lookupReady = search === phone.trim() && !matches.isFetching && !matches.isError;
  const ambiguous = (matches.data?.docs.length ?? 0) > 1 && !customer;
  const normalized = formatSmsNumber(phone, settings.smsPrefixCode);
  // As in unified-agent, the button follows the initiate-chat permission; the channels inside follow the tenant settings.
  if (!permitted || !canInitiate) return null;
  const setNumber = (value: string) => {
    setPhone(value);
    setCustomer(null);
  };
  const send = async () => {
    if (
      busy ||
      !user ||
      !lookupReady ||
      ambiguous ||
      !selectedSmsFrom ||
      !validSmsNumber(normalized, settings.smsPrefixCode)
    )
      return;
    const owner = user.id;
    setBusy(true);
    try {
      await startOutboundSms({
        destination: phone,
        from: selectedSmsFrom,
        text: sms,
        customer: matchedCustomer,
      });
      if (getSession().user?.id !== owner) return;
      setSms("");
      setPhone("");
      setCustomer(null);
      setPanelOpen(false);
      toast.success(t("snackbar.Outbound-Message-Sent-Successfully"));
      if (!settings.outboundSmsSendAndClose) navigate("/customers");
    } catch (error) {
      if (getSession().user?.id === owner) toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const callDisabled =
    !phone.trim() ||
    !registered ||
    callPhase !== "idle" ||
    busy ||
    (settings.cxVoice && !selectedVoiceFrom) ||
    !lookupReady ||
    ambiguous;
  const textDisabled =
    !validSmsNumber(normalized, settings.smsPrefixCode) ||
    busy ||
    !selectedSmsFrom ||
    !lookupReady ||
    ambiguous;
  // Say why a channel is greyed out instead of leaving a dead button.
  const voiceHint = !phone.trim()
    ? t("outbound.enter-number", { defaultValue: "Enter a number above" })
    : !registered
      ? t("workspace.reach.reason.PHONE_OFFLINE")
      : callPhase !== "idle"
        ? t("workspace.reach.reason.ON_CALL")
        : settings.cxVoice && voiceChannels.isFetched && !selectedVoiceFrom
          ? t("outbound.voice-unconfigured")
          : phone.trim();
  const textHint = !phone.trim()
    ? t("outbound.enter-number", { defaultValue: "Enter a number above" })
    : smsChannels.isFetched && !selectedSmsFrom
      ? t("outbound.sms-unconfigured")
      : !validSmsNumber(normalized, settings.smsPrefixCode)
        ? t("outbound.invalid-number", { defaultValue: "Not a valid number" })
        : normalized;
  const placeCall = async () => {
    const owner = user?.id;
    setBusy(true);
    try {
      await placeOutboundVoice(phone.trim(), {
        serviceIdentifier: selectedVoiceFrom,
        customer: matchedCustomer ?? undefined,
      });
      if (getSession().user?.id === owner) setPanelOpen(false);
    } catch (error) {
      if (getSession().user?.id === owner) toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!busy) setPanelOpen(next);
      }}
    >
      <IconTooltip label={t("app-header.outbound")}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="relative size-9 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label={t("app-header.outbound")}
          >
            <Send className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </Button>
        </PopoverTrigger>
      </IconTooltip>
      <PopoverContent
        align="end"
        className="max-h-[min(42rem,85dvh)] w-[min(24rem,calc(100vw-2rem))] space-y-3 overflow-auto p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{t("app-header.outbound")}</p>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t("outbound.toggle-dialpad")}
            aria-pressed={dialPad}
            onClick={() => setDialPad((value) => !value)}
          >
            <Grid3X3 className="size-4" />
          </Button>
        </div>
        {!hasChannels ? (
          <p className="text-xs text-muted-foreground">
            {t("outbound.no-channels", {
              defaultValue:
                "Calling and SMS aren't enabled for your account. Use Reach customer in a conversation for other channels.",
            })}
          </p>
        ) : (
          <>
            {activeCustomer && activePhone && !phone && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary-soft/40 px-2.5 py-1.5 text-xs">
                <div className="truncate">
                  <span className="text-muted-foreground">
                    {t("workspace.active-customer", { defaultValue: "Current customer:" })}
                  </span>{" "}
                  <span className="font-semibold text-foreground">{activeName || t("globals.customer")}</span>{" "}
                  <span className="text-muted-foreground tabular-nums">({activePhone})</span>
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="h-6 border-primary/30 px-2 text-[12px] font-medium text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => {
                    setPhone(activePhone);
                    setCustomer(activeCustomer as unknown as CustomerRow);
                  }}
                >
                  {t("globals.use", { defaultValue: "Use" })}
                </Button>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="outbound-number">{t("outbound.number-label")}</Label>
              <Input
                ref={input}
                id="outbound-number"
                type="tel"
                value={phone}
                disabled={busy}
                onChange={(event) => setNumber(event.target.value)}
                placeholder={t("globals.dialpad")}
                className="h-10"
              />
            </div>
            {dialPad && (
              <div className="grid grid-cols-3 gap-1" role="group" aria-label={t("outbound.dial-pad")}>
                {"123456789*0#".split("").map((digit) => (
                  <Button
                    key={digit}
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      const node = input.current;
                      const start = node?.selectionStart ?? phone.length;
                      const end = node?.selectionEnd ?? start;
                      setNumber(phone.slice(0, start) + digit + phone.slice(end));
                      requestAnimationFrame(() => {
                        node?.focus();
                        node?.setSelectionRange(start + 1, start + 1);
                      });
                    }}
                  >
                    {digit}
                  </Button>
                ))}
              </div>
            )}
            {search.length > 2 && (
              <div className="rounded-xl border p-1" aria-label={t("outbound.matching-customers")}>
                {matches.isFetching ? (
                  <p className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    {t("outbound.lookup-loading")}
                  </p>
                ) : matches.isError ? (
                  <p role="alert" className="p-2 text-xs text-destructive-text">
                    Customer lookup failed.{" "}
                    <button type="button" className="underline" onClick={() => void matches.refetch()}>
                      Retry
                    </button>
                  </p>
                ) : matches.data?.docs.length ? (
                  matches.data.docs.map((row) => (
                    <CustomerOption
                      key={row._id}
                      customer={row}
                      selected={matchedCustomer?._id === row._id}
                      onSelect={() => {
                        const value = row.phoneNumber ?? row.voice;
                        const number = Array.isArray(value) ? value[0] : value;
                        if (number) setPhone(String(number));
                        setCustomer(row);
                      }}
                    />
                  ))
                ) : (
                  <p className="p-2 text-xs text-muted-foreground">{t("outbound.lookup-empty")}</p>
                )}
              </div>
            )}
            {!composing && (
              <div className="space-y-1 border-t pt-3">
                <p className="px-1 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {t("outbound.choose-channel", { defaultValue: "Reach this number by" })}
                </p>
                {(settings.cxVoice || settings.cisco) && (
                  <ChannelRow
                    kind="CX_VOICE"
                    label={t("workspace.reach.channel.voice")}
                    hint={voiceHint}
                    extra={
                      voiceChannels.data &&
                      voiceChannels.data.channels.length > 1 && (
                        <Select value={selectedVoiceFrom} onValueChange={setVoiceFrom} disabled={busy}>
                          <SelectTrigger
                            size="sm"
                            aria-label={t("outbound.voice-from")}
                            className="mt-0.5 h-6 w-full max-w-56 border-border/60 bg-transparent px-1.5 text-xs"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {voiceChannels.data.channels.map((channel) => (
                              <SelectItem key={channel.serviceIdentifier} value={channel.serviceIdentifier!}>
                                {channelDisplayLabel(channel)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    }
                  >
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 shrink-0 gap-1.5 px-2.5 text-xs"
                      disabled={callDisabled}
                      onClick={() => void placeCall()}
                    >
                      <OutboundActionIcon kind="voice" className="size-[18px]" />
                      {t("workspace.reach.action.voice")}
                    </Button>
                  </ChannelRow>
                )}
                {settings.outboundSms && (
                  <ChannelRow kind="SMS" label={t("workspace.reach.channel.sms")} hint={textHint}>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 shrink-0 gap-1.5 px-2.5 text-xs"
                      disabled={textDisabled}
                      onClick={() => setComposing(true)}
                    >
                      <OutboundActionIcon kind="sms" className="size-[18px]" />
                      {t("workspace.reach.action.sms")}
                    </Button>
                  </ChannelRow>
                )}
              </div>
            )}
            {composing && settings.outboundSms && (
              <form
                className="space-y-2 border-t pt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
              >
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setComposing(false)}
                  disabled={busy}
                >
                  <ArrowLeft className="size-3.5 rtl:rotate-180" aria-hidden />
                  {t("workspace.reach.channel.sms")}
                </button>
                {smsChannels.data?.channels.length ? (
                  smsChannels.data.channels.length > 1 && (
                    <Select value={selectedSmsFrom} onValueChange={setSmsFrom} disabled={busy}>
                      <SelectTrigger aria-label={t("outbound.sms-from")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {smsChannels.data.channels.map((channel) => (
                          <SelectItem key={channel.serviceIdentifier} value={channel.serviceIdentifier!}>
                            {channelDisplayLabel(channel)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {smsChannels.isFetching ? (
                      t("outbound.sms-loading")
                    ) : (
                      <>
                        {t("outbound.sms-unconfigured")}{" "}
                        <button
                          type="button"
                          className="underline"
                          onClick={() => void smsChannels.refetch()}
                        >
                          Retry
                        </button>
                      </>
                    )}
                  </p>
                )}
                {phone.trim() && normalized !== phone.trim() && (
                  <p className="text-xs text-muted-foreground">
                    SMS destination:{" "}
                    <span className="font-medium text-foreground" dir="ltr">
                      {normalized}
                    </span>
                  </p>
                )}
                <Label htmlFor="outbound-sms">{t("outbound.message")}</Label>
                <Textarea
                  id="outbound-sms"
                  value={sms}
                  disabled={busy}
                  onChange={(event) => setSms(event.target.value)}
                  rows={3}
                  // Source outbound message-composer limit.
                  maxLength={1000}
                  placeholder={t("chat-features.interactions.Type-a-message")}
                />
                <p className="text-end text-xs text-muted-foreground tabular-nums" aria-live="polite">
                  {sms.length}/1000
                </p>
                <Button className="w-full" type="submit" disabled={textDisabled || !sms.trim() || busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {settings.outboundSmsSendAndClose ? t("outbound.send-close") : t("outbound.send-sms")}
                </Button>
              </form>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
