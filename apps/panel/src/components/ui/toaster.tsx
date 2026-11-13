import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { useToasts } from "./toast-store";

/** Region viva: los avisos se anuncian sin mover el foco. */
export function Toaster() {
  const { t } = useTranslation();
  const { toasts, dismiss } = useToasts();
  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="flex items-center gap-2 rounded-lg border-2 border-border bg-surface-raised p-3 shadow-floating">
          <p className="flex-1">{toast.message}</p>
          {toast.action && (
            <Button
              variant="outline"
              onClick={() => {
                toast.action?.run();
                dismiss(toast.id);
              }}
            >
              {toast.action.label}
            </Button>
          )}
          <Button variant="ghost" className="px-2" aria-label={t("common.close")} onClick={() => dismiss(toast.id)}>
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
