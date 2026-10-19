import { usePortalContainer } from "./portal-container";
import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  const container = usePortalContainer();
  return <SheetPrimitive.Portal container={container} data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  size = "md",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const width =
    size === "sm"
      ? "sm:max-w-sm"
      : size === "lg"
        ? "sm:max-w-lg"
        : size === "xl"
          ? "sm:max-w-xl"
          : "sm:max-w-md";

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-0 border-border/60 bg-surface/95 shadow-lift backdrop-blur-xl",
          "transition ease-[cubic-bezier(0.22,1,0.36,1)]",
          "data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-400",
          side === "right" &&
            cn(
              "inset-y-0 right-0 h-full w-[92%] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
              width,
            ),
          side === "left" &&
            cn(
              "inset-y-0 left-0 h-full w-[92%] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
              width,
            ),
          side === "top" &&
            "inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          side === "bottom" &&
            "inset-x-0 bottom-0 mx-auto h-auto max-h-[85vh] w-full max-w-2xl rounded-t-3xl border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className="absolute end-3 top-3 grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:ring-2 focus:ring-ring focus:outline-hidden">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 border-b border-border/60 px-5 py-4 pe-12", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex flex-col gap-2 border-t border-border/60 bg-muted/20 p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-display text-lg tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("min-h-0 flex-1 overflow-auto px-5 py-4", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetBody,
};
