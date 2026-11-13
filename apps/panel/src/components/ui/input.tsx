import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-touch w-full rounded-md border-2 border-border bg-surface-raised px-3 text-base text-text aria-[invalid=true]:border-danger disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
