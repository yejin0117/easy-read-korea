import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "destructive-outline":
          "border-2 border-destructive/40 bg-card text-destructive hover:bg-destructive-soft",
        outline: "border-2 border-input bg-card text-foreground hover:border-primary hover:bg-primary-soft",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-secondary",
        link: "text-primary underline underline-offset-4 hover:text-primary-hover",
        toggle:
          "border-2 border-input bg-card text-foreground hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary-soft aria-checked:border-primary aria-checked:bg-primary-soft",
      },
      size: {
        default: "min-h-11 px-5 py-2 text-base",
        sm: "min-h-11 px-4 py-1.5 text-base",
        lg: "min-h-14 px-7 py-3 text-lg",
        xl: "min-h-16 px-10 py-4 text-xl [&_svg]:size-6",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
