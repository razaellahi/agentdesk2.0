import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/core/api";
import { changePassword, getPasswordPolicies } from "@/core/auth";
import { cn } from "@/shared/lib/utils";
import { toRules, unmetRules } from "../passwordPolicy";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  /** forced: Keycloak "update password" required action at login; cannot be dismissed. */
  mode: "forced" | "voluntary";
  /** Temporary password typed at login (forced mode prefill). */
  currentPassword?: string;
  onChanged?: (newPassword: string) => void;
}

/**
 * Maps Keycloak's English policy failure to the matching translated rule
 * (unified-agent ChangePasswordDialogComponent error handling).
 */
function serverReasonKey(message: string): string | null {
  if (/invalid.*(current|old)|incorrect/i.test(message)) return "change-password.current-password-incorrect";
  if (/history|recently used|last \d+ passwords/i.test(message))
    return "change-password.password-history-policy";
  if (/special characters/i.test(message)) return "change-password.special-chars-policy";
  if (/upper case/i.test(message)) return "change-password.uppercase-policy";
  if (/lower case/i.test(message)) return "change-password.lowercase-policy";
  if (/numerical digits/i.test(message)) return "change-password.number-policy";
  if (/username/i.test(message)) return "change-password.must-not-username";
  if (/email/i.test(message)) return "change-password.must-not-email";
  return null;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  username,
  mode,
  currentPassword = "",
  onChanged,
}: ChangePasswordDialogProps) {
  const { t } = useTranslation();
  const [reveal, setReveal] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["password-policies"],
    queryFn: getPasswordPolicies,
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const rules = useMemo(() => toRules(policies), [policies]);

  const schema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, t("change-password.current-password-is-required")),
          newPassword: z
            .string()
            .min(1, t("change-password.new-password-is-required"))
            .refine((v) => v === v.trim(), t("change-password.new-password-cannot-contain-spaces")),
          confirmPassword: z.string().min(1, t("change-password.please-confirm-password")),
        })
        .refine((v) => v.newPassword === v.confirmPassword, {
          path: ["confirmPassword"],
          message: t("change-password.passwords-do-not-match"),
        })
        .refine((v) => unmetRules(rules, v.newPassword, username).length === 0, {
          path: ["newPassword"],
          message: t("auth.password-rules-unmet"),
        }),
    [rules, t, username],
  );
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword, newPassword: "", confirmPassword: "" },
    mode: "onTouched",
  });
  const newPassword = useWatch({ control: form.control, name: "newPassword" }) ?? "";
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      await changePassword({
        username,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success(t("change-password.password-updated-successfully"));
      form.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onOpenChange(false);
      onChanged?.(values.newPassword);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : String((error as Error)?.message ?? "");
      const key = serverReasonKey(message);
      const rule = key ? rules.find((r) => r.labelKey === key) : undefined;
      setServerError(key ? t(key, rule?.params ?? { count: "" }) : message);
    }
  });

  const forced = mode === "forced";
  const passwordType = reveal ? "text" : "password";

  return (
    <Dialog open={open} onOpenChange={(next) => (!forced || next) && onOpenChange(next)}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!forced}
        onInteractOutside={(e) => forced && e.preventDefault()}
        onEscapeKeyDown={(e) => forced && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {forced ? t("change-password.great-to-have-you-here") : t("change-password.change-password")}
          </DialogTitle>
          <DialogDescription>
            {forced
              ? t("change-password.Lets-secure-your-account-with-a-quick-password-update")
              : t("change-password.enter-your-current-password-to-set-a-new-one")}
          </DialogDescription>
        </DialogHeader>

        <form id="change-password-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {(["currentPassword", "newPassword", "confirmPassword"] as const).map((name) => (
            <div key={name} className="flex flex-col gap-1.5">
              <Label htmlFor={`cp-${name}`}>
                {t(
                  name === "currentPassword"
                    ? "change-password.current-password"
                    : name === "newPassword"
                      ? "change-password.new-password"
                      : "change-password.confirm-password",
                )}
              </Label>
              <div className="relative">
                <Input
                  id={`cp-${name}`}
                  type={passwordType}
                  autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
                  aria-invalid={Boolean(errors[name]) || undefined}
                  className="pe-9"
                  {...form.register(name)}
                />
                {name === "newPassword" && (
                  <button
                    type="button"
                    onClick={() => setReveal((r) => !r)}
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label={reveal ? t("auth.hide-password") : t("auth.show-password")}
                  >
                    {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                )}
              </div>
              {errors[name] && name !== "newPassword" && (
                <p className="text-sm text-destructive-text">{errors[name]?.message}</p>
              )}
            </div>
          ))}

          {(isLoading || rules.length > 0) && (
            <ul
              className="flex flex-col gap-1 rounded-md bg-surface-2 p-3 text-sm"
              aria-label={t("auth.password-rules")}
            >
              {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              {rules.map((rule) => {
                const ok = rule.check ? rule.check(newPassword, username) : null;
                return (
                  <li
                    key={rule.type}
                    className={cn(
                      "flex items-center gap-2",
                      ok === true && "text-success-text",
                      ok === false && newPassword && "text-muted-foreground",
                    )}
                  >
                    {ok ? (
                      <Check className="size-3.5 shrink-0" aria-hidden />
                    ) : (
                      <Circle className="size-3 shrink-0" aria-hidden />
                    )}
                    <span>{t(rule.labelKey, rule.params)}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {serverError && (
            <p
              role="alert"
              className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive-text"
            >
              {serverError}
            </p>
          )}
        </form>

        <DialogFooter>
          {!forced && (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("change-password.cancel")}
            </Button>
          )}
          <Button type="submit" form="change-password-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {t("change-password.change-password")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
