import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-sm font-medium text-text", className)} {...props} />;
}
