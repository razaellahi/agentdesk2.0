import { ArrowLeft, KeyRound, Loader2, Mail, MessageSquareText, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerTwoFactor,
  resendOtp,
  validateOtp,
  type LoginOutcome,
  type PasswordCredentials,
} from "@/core/auth";
import { formatDuration } from "@/core/i18n";
import { useResendTimer } from "../useResendTimer";
import { OtpField } from "./OtpField";

type TwoFactor = Extract<LoginOutcome, { kind: "twoFactor" }>;

interface TwoFactorStepProps {
  challenge: TwoFactor;
  credentials: PasswordCredentials;
  onBack: () => void;
  onError: (error: unknown) => void;
}

const MAX_RESENDS = 3;

/**
 * Two-factor flows from unified-agent LoginComponent:
 *  - app:   registered -> code; unregistered -> QR / secret setup + code
 *  - sms:   registered -> code sent to phone; unregistered -> phone, confirm, register, code
 *  - email: same as SMS with an email address
 *  - rsa:   SecurID passcode (maskable); unregistered users are told to contact an admin
 */
export function TwoFactorStep({ challenge, credentials, onBack, onError }: TwoFactorStepProps) {
  const { t } = useTranslation();
  const { channel, registered } = challenge;
  const isDelivery = channel === "sms" || channel === "email";

  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [destination, setDestination] = useState<string>(
    (channel === "sms" ? challenge.phoneNumber : challenge.email) ?? "",
  );
  const [confirmed, setConfirmed] = useState(registered);
  const [codeSent, setCodeSent] = useState(registered && isDelivery);
  const [resends, setResends] = useState(0);
  const timer = useResendTimer(channel === "sms" ? 30 : 60);

  useEffect(() => {
    if (registered && isDelivery) timer.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once on mount
  }, []);

  useEffect(() => {
    if (channel === "rsa" && !registered) {
      onError(new Error(t("auth.rsa-not-registered")));
      onBack();
    }
  }, [channel, registered, onBack, onError, t]);

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!code) return;
    setBusy(true);
    setInvalid(false);
    try {
      await validateOtp(credentials, code);
    } catch {
      setInvalid(true);
      if (channel === "rsa") onError(new Error(t("auth.rsa-verify-failed")));
    } finally {
      setBusy(false);
    }
  };

  const sendFirstCode = async () => {
    setBusy(true);
    try {
      // SMS: the API expects the number without the leading "+".
      await registerTwoFactor(credentials, channel === "sms" ? destination.replace(/^\+/, "") : destination);
      setCodeSent(true);
      timer.start();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!timer.canResend || resends >= MAX_RESENDS) return;
    setBusy(true);
    try {
      await resendOtp(credentials.username);
      setResends((n) => n + 1);
      toast.success(t("login.otp-resent-successfully"));
      timer.start();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  const editDestination = () => {
    setInvalid(false);
    if (registered) {
      onBack();
      return;
    }
    setConfirmed(false);
    setCodeSent(false);
  };

  const Icon =
    channel === "sms"
      ? MessageSquareText
      : channel === "email"
        ? Mail
        : channel === "rsa"
          ? KeyRound
          : Smartphone;
  const title =
    channel === "app"
      ? registered
        ? t("auth.two-factor-title")
        : t("login.authenticator-app-setup")
      : channel === "sms"
        ? registered
          ? t("auth.two-factor-title")
          : t("login.sms-auth-setup")
        : channel === "email"
          ? registered
            ? t("auth.two-factor-title")
            : t("login.email-auth-setup")
          : t("auth.rsa-title");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {channel === "app" && !registered && (
            <p className="text-sm text-muted-foreground">
              {t("login.setup-app-to-authenticate-your-account")}
            </p>
          )}
          {isDelivery && !registered && !confirmed && (
            <p className="text-sm text-muted-foreground">
              {channel === "sms" ? t("login.provide-phone-number-for-2fa") : t("login.provide-email-for-2fa")}
            </p>
          )}
        </div>
      </div>

      {/* Authenticator app setup (unregistered) */}
      {channel === "app" && !registered && (
        <ol className="flex list-none flex-col gap-3 text-sm">
          <li>
            <span className="font-medium">1.</span> {t("login.auth-step1")}
          </li>
          <li className="flex flex-col gap-2">
            <span>
              <span className="font-medium">2.</span> {t("login.auth-step2")}
            </span>
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-surface-2 p-3">
              {showSecret ? (
                <>
                  <Label className="text-xs">{t("login.enter-code-into-authenticator-app")}</Label>
                  <code className="w-full rounded bg-surface p-2 text-center font-mono text-sm break-all select-all">
                    {challenge.otpSecret}
                  </code>
                </>
              ) : (
                challenge.qrImage && (
                  <img src={challenge.qrImage} alt="QR code" className="size-40 rounded bg-white p-1" />
                )
              )}
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setShowSecret((s) => !s)}
              >
                {showSecret ? t("login.switch-to-qrcode") : t("login.unable-to-scan")}
              </button>
            </div>
          </li>
          <li>
            <span className="font-medium">3.</span> {t("login.auth-step3")}
          </li>
        </ol>
      )}

      {/* SMS / email: collect + confirm destination (unregistered) */}
      {isDelivery && !codeSent && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="two-factor-destination">
            {confirmed
              ? t(channel === "sms" ? "login.number-is-correct" : "login.email-is-correct")
              : t(channel === "sms" ? "login.enter-phone-number" : "login.enter-email-address")}
          </Label>
          {channel === "sms" ? (
            <PhoneInput
              id="two-factor-destination"
              international
              defaultCountry="PK"
              value={destination}
              onChange={(v) => setDestination(v ?? "")}
              disabled={confirmed}
              inputComponent={Input}
              className="ad-phone-input"
            />
          ) : (
            <Input
              id="two-factor-destination"
              type="email"
              placeholder="example@email.com"
              value={destination}
              disabled={confirmed}
              onChange={(e) => setDestination(e.target.value.trim())}
            />
          )}
        </div>
      )}

      {/* Code entry */}
      {(!isDelivery || codeSent) && (
        <form onSubmit={submitCode} className="flex flex-col gap-4" noValidate>
          <OtpField
            label={
              isDelivery
                ? `${t(channel === "sms" ? "login.enter-otp--sent-at" : "login.enter-otp-sent-to")} ${destination}`
                : channel === "rsa"
                  ? t("auth.rsa-passcode")
                  : t("login.enter-otp-to-login")
            }
            value={code}
            onChange={(v) => {
              setCode(v);
              setInvalid(false);
            }}
            invalid={invalid}
            maskable={channel === "rsa"}
            autoFocus
          />
          {isDelivery && resends < MAX_RESENDS && (
            <p className="text-sm text-muted-foreground">
              {t("login.code-not-received")}{" "}
              <button
                type="button"
                onClick={() => void resend()}
                disabled={!timer.canResend || busy}
                className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              >
                {t("login.resend")}
              </button>
              {!timer.canResend && <span className="tabular"> · {formatDuration(timer.remaining)}</span>}
            </p>
          )}
          <Button type="submit" size="lg" disabled={!code || busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {t("login.submit")}
          </Button>
        </form>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={isDelivery ? editDestination : onBack}>
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t("login.back")}
        </Button>
        {isDelivery && !codeSent && (
          <Button
            type="button"
            disabled={
              busy ||
              (channel === "sms"
                ? !destination || !isValidPhoneNumber(destination)
                : !/^\S+@\S+\.\S+$/.test(destination))
            }
            onClick={() => (confirmed ? void sendFirstCode() : setConfirmed(true))}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("login.next")}
          </Button>
        )}
      </div>
    </div>
  );
}
