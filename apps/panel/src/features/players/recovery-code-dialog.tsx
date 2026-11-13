import { Copy, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";

/** El codigo existe en claro solo en esta respuesta: se muestra una vez y no se guarda en ningun estado global. */
export function SecretCodeDialog({ title, warning, code, onClose }: { title: string; warning: string; code: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const close = () => {
    setCopied(false);
    onClose();
  };
  const copy = () => {
    if (code === null) return;
    void navigator.clipboard.writeText(code).then(() => setCopied(true));
  };
  return (
    <Dialog open={code !== null} onClose={close} title={title}>
      <p className="flex items-start gap-2">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
        <span>{warning}</span>
      </p>
      <p className="select-all rounded-md bg-surface p-4 text-center font-mono text-3xl font-bold tracking-widest">{code}</p>
      <div role="status" className="min-h-6 text-sm font-medium">
        {copied && t("common.copied")}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={copy}>
          <Copy aria-hidden="true" className="size-4" />
          {t("common.copy")}
        </Button>
        <Button onClick={close}>{t("common.done")}</Button>
      </div>
    </Dialog>
  );
}
