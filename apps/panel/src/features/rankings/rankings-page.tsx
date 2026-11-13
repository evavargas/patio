import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { statsOverview, statsRankings } from "../../api/panel-api";
import { PageTitle } from "../../components/page-title";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/query-states";
import { Card } from "../../components/ui/card";
import { Table, Td, Th } from "../../components/ui/table";
import { formatDay } from "../../lib/format";
import { StatsFilterBar, useStatsFilters } from "../dashboard/stats-filters";

// Vista solo para adultos del panel. Las listas se ordenan por el dato, sin lenguaje de competencia.
export function RankingsPage() {
  const { t } = useTranslation();
  const { filters, setParam } = useStatsFilters();
  const q = useQuery({ queryKey: ["stats", "rankings", filters], queryFn: () => statsRankings(filters) });
  // `to` de overview = ayer, para limitar el selector (mismo dato que usa el Resumen).
  const last = useQuery({ queryKey: ["stats", "overview", {}], queryFn: () => statsOverview({}), select: (d) => d.to });

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t("nav.rankings")}</PageTitle>
      <p className="flex items-start gap-2 rounded-lg bg-info-soft p-3 font-medium">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-info" />
        <span>{t("rankings.note")}</span>
      </p>
      <StatsFilterBar filters={filters} setParam={setParam} firstDay={q.data?.from} lastDay={last.data} />

      {q.isPending && <ListSkeleton />}
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      {q.isSuccess && q.data.groups.length === 0 && <EmptyState />}
      {q.isSuccess &&
        q.data.groups.map((g) => (
          <section key={g.groupId} aria-labelledby={`r-${g.groupId}`} className="flex flex-col gap-3">
            <h2 id={`r-${g.groupId}`} className="text-xl font-bold">
              {g.name}
            </h2>
            <p className="text-sm text-text-muted">{t("rankings.range", { from: formatDay(q.data.from, true), to: formatDay(q.data.to, true) })}</p>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">{t("rankings.commitment")}</h3>
                <p className="text-sm text-text-muted">{t("rankings.commitmentHelp")}</p>
                {g.commitment.length === 0 ? (
                  <EmptyState />
                ) : (
                  <Table caption={`${g.name}: ${t("rankings.commitment")}`}>
                    <thead>
                      <tr>
                        <Th>{t("rankings.position")}</Th>
                        <Th>{t("players.nickname")}</Th>
                        <Th>{t("rankings.daysEntered")}</Th>
                        <Th>{t("rankings.achievedOf")}</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.commitment.map((r, i) => (
                        <tr key={r.playerId}>
                          <Td>{i + 1}</Td>
                          <Td>{r.nickname}</Td>
                          <Td>{r.daysEntered}</Td>
                          <Td>{t("rankings.achievedValue", { achieved: r.achieved, available: r.available })}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>
              <Card className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">{t("rankings.progress")}</h3>
                <p className="text-sm text-text-muted">{t("rankings.progressHelp")}</p>
                {g.progress.length === 0 ? (
                  <EmptyState />
                ) : (
                  <Table caption={`${g.name}: ${t("rankings.progress")}`}>
                    <thead>
                      <tr>
                        <Th>{t("rankings.position")}</Th>
                        <Th>{t("players.nickname")}</Th>
                        <Th>{t("players.level")}</Th>
                        <Th>{t("players.score")}</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.progress.map((r, i) => (
                        <tr key={r.playerId}>
                          <Td>{i + 1}</Td>
                          <Td>{r.nickname}</Td>
                          <Td>{r.level}</Td>
                          <Td>{r.score}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>
            </div>
          </section>
        ))}
    </div>
  );
}
