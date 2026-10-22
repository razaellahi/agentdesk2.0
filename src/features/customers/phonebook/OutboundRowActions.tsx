import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeskSettings } from "@/core/agent-settings";
import { useCurrentUser, usePermission } from "@/core/auth";
import { placeOutboundVoice, useCallStore } from "@/features/voice";
import { getOutboundFromChannels, OutboundActionIcon, shouldBlockOutbound } from "@/features/workspace";
import { OutboundComposeSheet, type OutboundComposeRequest } from "./OutboundComposeSheet";
import { formatCellValue } from "./customersQuery";
import type { CustomerDoc } from "./types";

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  const text = formatCellValue(value);
  return text === "—"
    ? []
    : text
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
}

export function OutboundRowActions({
  customer,
  hidden = false,
  size = "icon-sm",
  className,
}: {
  customer: CustomerDoc;
  /** UA hides row outbound while linking from a conversation. */
  hidden?: boolean;
  size?: "icon-xs" | "icon-sm" | "sm";
  className?: string;
}) {
  const { t } = useTranslation();
  const settings = useDeskSettings();
  const user = useCurrentUser();
  const permitted = usePermission("agentSession");
  const registered = useCallStore((s) => s.registered);
  const [busy, setBusy] = useState(false);
  const [compose, setCompose] = useState<OutboundComposeRequest | null>(null);
  const phones = [
    ...asList(customer.phoneNumber),
    ...asList(customer.voice),
    ...asList(customer.phone),
  ].filter((value, index, all) => all.indexOf(value) === index);
  const whatsapp = [
    ...asList(customer.whatsapp),
    ...asList(customer.phoneNumber),
    ...asList(customer.phone),
  ].filter((value, index, all) => all.indexOf(value) === index);
  const emails = asList(customer.email);
  const showVoice = Boolean(settings?.cxVoice || settings?.cisco) && phones.length > 0;
  const showSms = Boolean(settings?.outboundSms) && phones.length > 0 && Boolean(user);
  const showWhatsapp = whatsapp.length > 0 && Boolean(user);
  const showEmail = emails.length > 0 && Boolean(user);

  if (hidden || !permitted || (!showVoice && !showSms && !showWhatsapp && !showEmail)) return null;

  const guard = async (channel: string, value: string) => {
    const result = await shouldBlockOutbound({
      customer,
      value,
      channel,
      complianceEnabled: settings?.callingCompliance,
    });
    if (result.blocked) {
      toast.error(
        result.reason === "OPT_OUT"
          ? t("snackbar.Outbound-Blocked-Opt-Out")
          : result.reason === "DNC_CHECK_FAILED"
            ? t("snackbar.Outbound-DNC-Check-Failed")
            : t("snackbar.Outbound-Blocked-DNC"),
      );
      return false;
    }
    return true;
  };

  const btnClass = cn(
    size === "icon-xs" ? "size-7" : "size-8",
    // The channel's own mark in one round hit area, so every channel reads the same.
    "rounded-full hover:bg-surface-2",
    className,
  );

  return (
    <>
      {/* The phonebook row ignores clicks inside its actions (data-prevent-row-click). */}
      <div className="flex items-center justify-end gap-0.5" data-prevent-row-click>
        {showVoice && phones.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size={size}
                variant="ghost"
                aria-label={t("chat-features.interactions.call-customer")}
                title={t("chat-features.interactions.call-customer")}
                onClick={(event) => event.stopPropagation()}
                className={btnClass}
              >
                <OutboundActionIcon kind="voice" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {phones.map((phone) => (
                <DropdownMenuItem
                  key={`call-${phone}`}
                  disabled={!registered || busy}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!registered) {
                      toast.error(t("snackbar.SIP-Not-Connected"));
                      return;
                    }
                    setBusy(true);
                    void guard("CX_VOICE", phone)
                      .then(async (ok) => {
                        if (!ok) return;
                        const from = await getOutboundFromChannels("CX_VOICE").catch(() => null);
                        await placeOutboundVoice(phone, { customer, serviceIdentifier: from?.selected });
                      })
                      .catch((error: Error) => toast.error(error.message))
                      .finally(() => setBusy(false));
                  }}
                >
                  <OutboundActionIcon kind="voice" className="me-1.5 size-4" />
                  {phone}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {showSms && user && phones.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size={size}
                variant="ghost"
                aria-label="SMS"
                title="SMS"
                onClick={(event) => event.stopPropagation()}
                className={btnClass}
              >
                <OutboundActionIcon kind="sms" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {phones.map((phone) => (
                <DropdownMenuItem
                  key={`sms-${phone}`}
                  disabled={busy}
                  onClick={(event) => {
                    event.stopPropagation();
                    setCompose({
                      channel: "SMS",
                      destination: phone,
                      customer,
                      complianceEnabled: settings?.callingCompliance,
                    });
                  }}
                >
                  <OutboundActionIcon kind="sms" className="me-1.5 size-4" />
                  {phone}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {showWhatsapp && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size={size}
                variant="ghost"
                aria-label={t("chat-features.interactions.chat-whatsapp")}
                title={t("chat-features.interactions.chat-whatsapp")}
                onClick={(event) => event.stopPropagation()}
                className={btnClass}
              >
                <OutboundActionIcon kind="whatsapp" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {whatsapp.map((number) => (
                <DropdownMenuItem
                  key={`wa-${number}`}
                  disabled={busy}
                  onClick={(event) => {
                    event.stopPropagation();
                    setCompose({
                      channel: "WHATSAPP",
                      destination: number,
                      customer,
                      complianceEnabled: settings?.callingCompliance,
                    });
                  }}
                >
                  <OutboundActionIcon kind="whatsapp" className="me-1.5 size-4" />
                  {number}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {showEmail && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size={size}
                variant="ghost"
                aria-label={t("globals.email")}
                title={t("globals.email")}
                onClick={(event) => event.stopPropagation()}
                className={btnClass}
              >
                <OutboundActionIcon kind="email" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {emails.map((addr) => (
                <DropdownMenuItem
                  key={`email-${addr}`}
                  disabled={busy}
                  onClick={(event) => {
                    event.stopPropagation();
                    setCompose({
                      channel: "EMAIL",
                      destination: addr,
                      customer,
                      complianceEnabled: settings?.callingCompliance,
                    });
                  }}
                >
                  <OutboundActionIcon kind="email" className="me-1.5 size-4" />
                  {addr}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {compose && (
        <OutboundComposeSheet
          key={`${compose.channel}:${compose.destination}`}
          request={compose}
          onClose={() => setCompose(null)}
        />
      )}
    </>
  );
}
