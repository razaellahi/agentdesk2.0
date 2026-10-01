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
        "flex h-full min-h-64 flex-col items-center justify-center gap-3 p-8 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon className="size-6" aria-hidden />
        </div>
      )}
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
