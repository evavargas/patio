import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border-2 border-border bg-surface-raised p-6 shadow-raised", className)} {...props} />;
}
