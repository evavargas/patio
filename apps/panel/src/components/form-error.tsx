import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/http";

/** Mensaje traducido por codigo de dominio. Icono y texto: nunca solo color. */
export function FormError({ error }: { error: unknown }) {
  const { t, i18n } = useTranslation();
  if (!error) return null;
  const code = error instanceof ApiError ? error.code : "UNKNOWN";
  const key = i18n.exists(`errors.${code}`) ? `errors.${code}` : "errors.UNKNOWN";
  return (
    <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm font-medium text-text">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
      {t(key)}
    </p>
  );
}
