import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

// Contenedor con desplazamiento horizontal para pantallas angostas. `tabIndex` permite desplazar con teclado.
export function Table({ className, caption, ...props }: HTMLAttributes<HTMLTableElement> & { caption: string }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- region desplazable: sin foco, el teclado no puede recorrerla (WCAG 2.1.1)
    <div tabIndex={0} role="region" aria-label={caption} className="overflow-x-auto rounded-lg border-2 border-border">
      <table className={cn("w-full border-collapse text-left text-base", className)} {...props}>
        <caption className="sr-only">{caption}</caption>
        {props.children}
      </table>
    </div>
  );
}
export const Th = ({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th scope="col" className={cn("whitespace-nowrap bg-surface px-3 py-2 text-sm font-semibold", className)} {...props} />
);
export const Td = ({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("border-t border-border px-3 py-2 align-middle", className)} {...props} />
);
