import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none focus-visible:border-ring focus-visible:ring-[2px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-2xs hover:bg-primary-hover hover:shadow-xs active:bg-primary-hover",
        destructive:
          "bg-destructive text-white shadow-2xs hover:bg-destructive/90 focus-visible:ring-destructive/20 active:bg-destructive/95 dark:bg-destructive dark:hover:bg-destructive/90",
        outline:
          "border border-border bg-surface text-foreground shadow-2xs hover:border-border-strong hover:bg-surface-2 active:bg-surface-3 dark:border-border dark:bg-surface dark:hover:bg-surface-2",
        secondary: "bg-primary-soft text-primary hover:bg-primary-soft/80 active:bg-primary-soft/90",
        ghost: "text-foreground hover:bg-surface-2 active:bg-surface-3 dark:hover:bg-surface-2",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-10 rounded-lg px-6 text-base has-[>svg]:px-4",
        icon: "size-9 rounded-full",
        "icon-xs": "size-6 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
