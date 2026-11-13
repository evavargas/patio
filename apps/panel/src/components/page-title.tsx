import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../lib/cn";

let isFirstRender = true;

/** h1 de cada pantalla. Al cambiar de pantalla el foco va al titulo (doc 08); en la primera carga no. */
export function PageTitle({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!isFirstRender) ref.current?.focus();
    isFirstRender = false;
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} className={cn("text-2xl font-bold leading-tight outline-none", className)}>
      {children}
    </h1>
  );
}
