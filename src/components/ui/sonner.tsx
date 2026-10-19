import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Theme is passed in by the app (core/theme), not read from next-themes. */
const Toaster = (props: ToasterProps) => (
  <Sonner
    className="toaster group"
    icons={{
      success: <CircleCheckIcon className="size-4" />,
      info: <InfoIcon className="size-4" />,
      warning: <TriangleAlertIcon className="size-4" />,
      error: <OctagonXIcon className="size-4" />,
      loading: <Loader2Icon className="size-4 animate-spin" />,
    }}
    toastOptions={{
      classNames: {
        toast:
          "group toast rounded-2xl border border-border/60 bg-surface/95 text-foreground shadow-lift backdrop-blur-xl ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
        title: "text-sm font-semibold",
        description: "text-xs text-muted-foreground",
        actionButton: "rounded-lg bg-primary text-primary-foreground",
        cancelButton: "rounded-lg bg-muted text-muted-foreground",
        closeButton:
          "rounded-lg border border-border/60 bg-surface text-muted-foreground hover:bg-muted hover:text-foreground",
      },
    }}
    style={
      {
        "--normal-bg": "var(--surface)",
        "--normal-text": "var(--body)",
        "--normal-border": "var(--border)",
        "--border-radius": "16px",
      } as CSSProperties
    }
    {...props}
  />
);

export { Toaster };
