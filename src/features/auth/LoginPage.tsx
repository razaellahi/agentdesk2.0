import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowBigUpDash,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { lazy, Suspense, useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyPreferences, fetchPreferences } from "@/core/agent-settings";
import { ApiError } from "@/core/api";
import {
  loginWithPassword,
  TenantMismatchError,
  type LoginOutcome,
  type PasswordCredentials,
} from "@/core/auth";
import { cn } from "@/shared/lib/utils";
import { useBootError } from "./bootError";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
import { LoginHero } from "./components/LoginHero";

const TwoFactorStep = lazy(() =>
  import("./components/TwoFactorStep").then((m) => ({ default: m.TwoFactorStep })),
);

type Step =
  | { kind: "credentials" }
  | { kind: "twoFactor"; challenge: Extract<LoginOutcome, { kind: "twoFactor" }> }
  | { kind: "changePassword" };

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[13px] text-destructive-text">
      {message}
    </p>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const bootError = useBootError();
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [credentials, setCredentials] = useState<PasswordCredentials>({ username: "", password: "" });
  const [error, setError] = useState<string | null>(bootError);
  const [reveal, setReveal] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        username: z.string().trim().min(1, t("login.valid-credentials")),
        password: z.string().min(1, t("login.valid-credentials")),
      }),
    [t],
  );
  const form = useForm<PasswordCredentials>({ resolver: zodResolver(schema), defaultValues: credentials });

  const showError = useCallback(
    (err: unknown) => {
      if (err instanceof TenantMismatchError) setError(err.message);
      else if (err instanceof ApiError) setError(err.isNetwork ? t("auth.service-unreachable") : err.message);
      else setError((err as Error)?.message || t("snackbar.error-on-login-request"));
    },
    [t],
  );

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    setCredentials(values);
    try {
      const outcome = await loginWithPassword(values);
      if (outcome.kind === "twoFactor") setStep({ kind: "twoFactor", challenge: outcome });
      else if (outcome.kind === "passwordChangeRequired") {
        // As unified-agent: show the forced change in the user's saved theme/language.
        if (outcome.userId) {
          await fetchPreferences(outcome.userId, { anonymous: true })
            .then((prefs) => prefs && applyPreferences(prefs))
            .catch(() => undefined);
        }
        setStep({ kind: "changePassword" });
      }
    } catch (err) {
      showError(err);
    }
  });

  const back = useCallback(() => {
    setStep({ kind: "credentials" });
  }, []);

  const afterPasswordChange = async (newPassword: string) => {
    const next = { username: credentials.username, password: newPassword };
    setCredentials(next);
    form.reset(next);
    setStep({ kind: "credentials" });
    try {
      const outcome = await loginWithPassword(next);
      if (outcome.kind === "twoFactor") setStep({ kind: "twoFactor", challenge: outcome });
    } catch (err) {
      showError(err);
    }
  };

  const { errors, isSubmitting } = form.formState;
  const fieldClass =
    "h-12 rounded-xl border-transparent bg-muted/70 ps-11 text-[14px] hover:border-border hover:bg-muted focus-visible:border-primary focus-visible:bg-surface focus-visible:ring-4 focus-visible:ring-primary/12";
  const iconClass =
    "pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus-visible:text-primary";
  const trackCapsLock = (event: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);

  return (
    <div className="grid min-h-full lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <LoginHero />

      <main className="relative flex flex-col items-center justify-center bg-surface px-6 py-10">
        <div className="desk-enter w-full max-w-[400px]">
          {/* The hero carries the logo from large screens up. */}
          <BrandLogo className="mb-10 h-10 w-auto max-w-[220px] lg:hidden" />

          <div>
            {error && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive-soft px-3.5 py-3 text-sm text-destructive-text"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            {step.kind === "twoFactor" ? (
              <Suspense fallback={<Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />}>
                <TwoFactorStep
                  challenge={step.challenge}
                  credentials={credentials}
                  onBack={back}
                  onError={showError}
                />
              </Suspense>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-7" noValidate>
                <div>
                  <h1 className="font-display text-[1.9rem] font-semibold tracking-[-0.03em]">
                    {t("auth.welcome")}
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-balance text-muted-foreground">
                    {t("auth.sign-in-hint")}
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="username" className="text-[13px] font-medium text-medium">
                      {t("login.username")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="username"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        autoFocus
                        className={cn(fieldClass, "peer")}
                        aria-invalid={Boolean(errors.username) || undefined}
                        aria-describedby={errors.username ? "username-error" : undefined}
                        {...form.register("username")}
                      />
                      <UserRound className={iconClass} aria-hidden />
                    </div>
                    <FieldError id="username-error" message={errors.username?.message} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="password" className="text-[13px] font-medium text-medium">
                      {t("login.password")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={reveal ? "text" : "password"}
                        autoComplete="current-password"
                        className={cn(fieldClass, "peer pe-11")}
                        aria-invalid={Boolean(errors.password) || undefined}
                        aria-describedby={errors.password ? "password-error" : undefined}
                        onKeyDown={trackCapsLock}
                        onKeyUp={trackCapsLock}
                        {...form.register("password", { onBlur: () => setCapsLock(false) })}
                      />
                      <LockKeyhole className={iconClass} aria-hidden />
                      <button
                        type="button"
                        onClick={() => setReveal((r) => !r)}
                        className="absolute end-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
                        aria-label={reveal ? t("auth.hide-password") : t("auth.show-password")}
                        aria-pressed={reveal}
                      >
                        {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <FieldError id="password-error" message={errors.password?.message} />
                    {capsLock && (
                      <p className="flex items-center gap-1.5 text-[13px] text-warning-text" role="status">
                        <ArrowBigUpDash className="size-3.5" aria-hidden />
                        {t("auth.caps-lock-on")}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="group mt-1 h-12 w-full rounded-xl bg-gradient-to-b from-primary to-primary-hover text-[14px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_10px_24px_-12px_var(--primary)] transition-[box-shadow,transform] hover:shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_14px_28px_-12px_var(--primary)] active:scale-[0.99]"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting || undefined}
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  {t("login.login")}
                  {!isSubmitting && (
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                      aria-hidden
                    />
                  )}
                </Button>
              </form>
            )}
          </div>

          <p className="mt-8 text-[13px] text-muted-foreground">{t("auth.trouble-signing-in")}</p>
        </div>
      </main>

      <ChangePasswordDialog
        open={step.kind === "changePassword"}
        onOpenChange={(open) => !open && setStep({ kind: "credentials" })}
        username={credentials.username}
        currentPassword={credentials.password}
        mode="forced"
        onChanged={(pw) => void afterPasswordChange(pw)}
      />
    </div>
  );
}
