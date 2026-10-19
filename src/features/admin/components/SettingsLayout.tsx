import type { LucideIcon } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/shared/lib/utils";

export interface SectionMeta {
  id: string;
  title: string;
  icon: LucideIcon;
}

/** Sticky in-page index with scroll-spy for long settings pages. */
export function SectionIndex({ sections }: { sections: SectionMeta[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-10% 0px -70% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      className="sticky top-4 hidden w-56 shrink-0 self-start rounded-xl border border-border bg-surface p-2 xl:block"
      aria-label="Sections"
    >
      <ul className="flex flex-col gap-0.5">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={cn(
                "flex items-center gap-2.5 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
                active === s.id &&
                  "bg-primary-lt hover:bg-primary-lt font-medium text-primary hover:text-primary",
              )}
            >
              <s.icon className="size-4 shrink-0" aria-hidden />
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-4 rounded-xl border border-border bg-surface"
      aria-labelledby={`${id}-title`}
    >
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <div className="bg-primary-lt grid size-9 shrink-0 place-items-center rounded-full text-primary">
          <Icon className="size-4.5" aria-hidden />
        </div>
        <div>
          <h3 id={`${id}-title`} className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

interface ToggleRowProps {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Nested settings revealed while the toggle is on. */
  children?: ReactNode;
  hint?: ReactNode;
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  children,
  hint,
}: ToggleRowProps) {
  const id = useId();
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
            {hint}
          </Label>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5" />
      </div>
      {checked && children && (
        <div className="mt-4 flex flex-col gap-4 border-s-2 border-border-primary ps-4">{children}</div>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  description?: ReactNode;
  error?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}

/** Label + control + help/error, used for inputs inside sections and nested blocks. */
export function Field({ label, description, error, htmlFor, children, className }: FieldProps) {
  return (
    <div
      className={cn("flex flex-col gap-1.5", className)}
      data-settings-invalid={error ? htmlFor : undefined}
    >
      <Label htmlFor={htmlFor} className={cn("text-sm font-medium", error && "text-destructive-text")}>
        {label}
      </Label>
      <div className={cn(error && "rounded-xl ring-2 ring-destructive/50")}>{children}</div>
      {error ? (
        <p className="text-sm text-destructive-text" role="alert">
          {error}
        </p>
      ) : (
        description && <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function PlainRow({ children }: { children: ReactNode }) {
  return <div className="px-5 py-4">{children}</div>;
}
