import { CircleAlert, Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/http";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

/** Texto traducido por codigo de dominio (cae en UNKNOWN). */
export function useErrorText() {
  const { t, i18n } = useTranslation();
  return (error: unknown): string => {
    const code = error instanceof ApiError ? error.code : "UNKNOWN";
    return t(i18n.exists(`errors.${code}`) ? `errors.${code}` : "errors.UNKNOWN");
  };
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const text = useErrorText();
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg bg-danger-soft p-4">
      <p className="flex items-start gap-2 font-medium">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
        <span>
          {t("states.error")} {text(error)}
        </span>
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {t("states.retry")}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <p className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-text-muted">
      <Inbox aria-hidden="true" className="size-5" />
      {text ?? t("states.empty")}
    </p>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t("states.loading")} className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
