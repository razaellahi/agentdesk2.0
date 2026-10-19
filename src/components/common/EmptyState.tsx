import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "desk-enter flex h-full min-h-64 flex-col items-center justify-center gap-3 p-10 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon className="size-6" aria-hidden />
        </div>
      )}
      <div className="space-y-1">
        <h2 className="text-lg font-medium tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
