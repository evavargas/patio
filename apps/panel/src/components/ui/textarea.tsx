import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("min-h-24 w-full rounded-md border-2 border-border bg-surface-raised px-3 py-2 text-base text-text aria-[invalid=true]:border-danger disabled:opacity-60", className)}
      {...props}
    />
  );
}
