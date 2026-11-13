import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DeletionImpact } from "@patio/contracts";
import { ErrorState, ListSkeleton } from "./query-states";

/** Aviso de borrado definitivo + conteos del servidor. Sin "deshacer": lo dice el texto. */
export function DeletionImpactView({ queryKey, fetcher, warning }: { queryKey: readonly unknown[]; fetcher: () => Promise<DeletionImpact>; warning: string }) {
  const { t, i18n } = useTranslation();
  const q = useQuery({ queryKey, queryFn: fetcher, gcTime: 0 });
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-start gap-2 font-medium">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
        <span>{warning}</span>
      </p>
      {q.isPending && <ListSkeleton rows={2} />}
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      {q.data && (
        <ul className="list-disc pl-6">
          {Object.entries(q.data.counts).map(([key, n]) => (
            <li key={key}>{i18n.exists(`impact.${key}`, { count: n }) ? t(`impact.${key}`, { count: n }) : `${key}: ${n}`}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
