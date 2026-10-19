import * as React from "react";
import { cn } from "@/shared/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border border-input/90 bg-surface/90 px-3 py-2 text-base shadow-none transition-[color,box-shadow,border-color] duration-200 outline-none placeholder:text-muted-foreground hover:border-border-strong focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
