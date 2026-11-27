import { cn } from "@repo/design-system/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "pressable inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.14),0_1px_2px_oklch(0.21_0.014_264/0.12)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.12)] hover:bg-destructive/90 focus-visible:ring-destructive/30 dark:bg-destructive/15 dark:text-destructive dark:shadow-none dark:hover:bg-destructive/25",
        outline:
          "border border-input bg-card text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/20 dark:hover:bg-input/40",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline active:!scale-100",
      },
      size: {
        default: "h-9 px-4 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-sm px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 px-6 text-[0.9375rem] has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
  VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "default",
      size = "default",
      loading = false,
      icon,
      children,
      disabled,
      ...props
    },
    ref
  ) {
    return (
      <button
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size, className }))}
        data-size={size}
        data-slot="button"
        data-variant={variant}
        ref={ref}
        {...props}
        disabled={loading || disabled}
      >
        {loading ? (
          <div className="grid place-items-center">
            {/* opacity-0 rather than invisible: the hidden content keeps the button's width and its text stays the accessible name. */}
            <div className="col-start-1 row-start-1 flex items-center gap-2 opacity-0">
              {icon}
              {children}
            </div>
            <Spinner aria-hidden="true" className="col-start-1 row-start-1" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {icon && icon}
            {children}
          </div>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
