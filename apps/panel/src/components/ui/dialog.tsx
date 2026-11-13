import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "./button";

// <dialog> nativo con showModal(): foco atrapado, Escape y fondo inerte sin librerias ni <style> en linea (CSP estricta).
interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // el cierre pedido por el padre (open=false) tambien dispara "close": solo avisa si lo cerro la persona (Escape o boton)
      onClose={() => openRef.current && onClose()}
      className={cn(
        "m-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border-2 border-border bg-surface-raised p-6 text-text shadow-floating backdrop:bg-text/50",
        className,
      )}
    >
      {open && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <h2 id={titleId} className="text-xl font-bold">
              {title}
            </h2>
            <Button variant="ghost" className="px-2" aria-label={t("common.close")} onClick={onClose}>
              <X aria-hidden="true" className="size-5" />
            </Button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
