import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OtpFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  /** RSA SecurID passcodes can be masked. */
  maskable?: boolean;
  autoFocus?: boolean;
}

export function OtpField({ label, value, onChange, invalid, maskable, autoFocus }: OtpFieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const [masked, setMasked] = useState(Boolean(maskable));
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          type={maskable && masked ? "password" : "text"}
          inputMode={maskable ? "text" : "numeric"}
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          aria-invalid={invalid || undefined}
          className="h-11 text-center font-mono text-lg tracking-[0.3em]"
        />
        {maskable && (
          <button
            type="button"
            onClick={() => setMasked((m) => !m)}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={masked ? t("auth.show-code") : t("auth.hide-code")}
          >
            {masked ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {invalid && <p className="text-sm text-destructive-text">{t("login.incorrect-code")}</p>}
    </div>
  );
}
