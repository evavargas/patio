import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex min-h-touch items-center justify-center gap-2 rounded-md px-4 text-base font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-contrast hover:bg-primary/90",
        outline: "border-2 border-border bg-surface-raised text-text hover:bg-primary-soft",
        ghost: "text-text hover:bg-primary-soft",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, asChild = false, type = "button", ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant }), className)} type={asChild ? undefined : type} {...props} />;
}
