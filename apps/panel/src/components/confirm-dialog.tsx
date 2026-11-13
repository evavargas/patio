import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { FormError } from "./form-error";
import type { ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending: boolean;
  error: unknown;
  /** Impacto: solo hay boton de confirmar cuando `ready`. */
  ready?: boolean;
  children: ReactNode;
}

export function ConfirmDialog({ open, onClose, title, confirmLabel, onConfirm, pending, error, ready = true, children }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {children}
      <FormError error={error} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button onClick={onConfirm} disabled={pending || !ready}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
