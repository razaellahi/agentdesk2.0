import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { BrandLogo } from "@/components/common/BrandLogo";
import { LanguageMenu } from "@/components/common/LanguageMenu";
import { ThemeMenu } from "@/components/common/ThemeMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/core/api";
import {
  loginWithPassword,
  TenantMismatchError,
  type LoginOutcome,
  type PasswordCredentials,
} from "@/core/auth";
import { useBootError } from "./bootError";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
// Phone-number metadata (libphonenumber) is only needed for SMS 2FA.
const TwoFactorStep = lazy(() =>
  import("./components/TwoFactorStep").then((m) => ({ default: m.TwoFactorStep })),
);

type Step =
  | { kind: "credentials" }
  | { kind: "twoFactor"; challenge: Extract<LoginOutcome, { kind: "twoFactor" }> }
  | { kind: "changePassword" };

export function LoginPage() {
  const { t } = useTranslation();
  const bootError = useBootError();
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [credentials, setCredentials] = useState<PasswordCredentials>({ username: "", password: "" });
  const [error, setError] = useState<string | null>(bootError);
  const [reveal, setReveal] = useState(false);

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
      else if (outcome.kind === "passwordChangeRequired") setStep({ kind: "changePassword" });
      // "authenticated": the router redirects away from /login.
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

  return (
    <div className="grid min-h-full bg-canvas lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel */}
      <section
        aria-hidden
        className="relative hidden overflow-hidden bg-brand text-on-brand lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <div className="pointer-events-none absolute -end-24 -top-24 size-96 rounded-full bg-brand-2 opacity-70" />
        <div className="pointer-events-none absolute -start-16 -bottom-32 size-[28rem] rounded-full border-[48px] border-on-brand/10" />
        <div className="relative flex items-center gap-3">
          <BrandLogo inverted className="h-9" />
          <span className="border-s border-on-brand/30 ps-3 text-lg font-semibold tracking-tight">
            Agent Desk
          </span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl leading-tight font-bold tracking-tight">{t("login.agent-desk")}</h2>
          <p className="mt-3 text-lg opacity-85">{t("auth.tagline")}</p>
        </div>
        <p className="relative text-sm opacity-70">{t("login.call-center-experts")}</p>
      </section>

      {/* Form panel */}
      <main className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2 lg:invisible">
            <BrandLogo className="h-7" />
          </div>
          <div className="flex items-center gap-1">
            <LanguageMenu />
            <ThemeMenu />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <div className="w-full max-w-sm">
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2 rounded-md bg-destructive-soft px-3 py-2.5 text-sm text-destructive-text"
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
              <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{t("auth.welcome")}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t("login.valid-credentials")}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="username">{t("login.username")}</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    autoFocus
                    className="h-10"
                    aria-invalid={Boolean(form.formState.errors.username) || undefined}
                    {...form.register("username")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">{t("login.password")}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={reveal ? "text" : "password"}
                      autoComplete="current-password"
                      className="h-10 pe-10"
                      aria-invalid={Boolean(form.formState.errors.password) || undefined}
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setReveal((r) => !r)}
                      className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                      aria-label={reveal ? t("auth.hide-password") : t("auth.show-password")}
                    >
                      {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogIn className="size-4 rtl:rotate-180" />
                  )}
                  {t("login.login")}
                </Button>
              </form>
            )}
          </div>
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
