import type { SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

// <select> nativo: teclado, lectores de pantalla y movil resueltos por el navegador.
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("min-h-touch w-full rounded-md border-2 border-border bg-surface-raised px-3 text-base text-text disabled:opacity-60", className)}
      {...props}
    />
  );
}
