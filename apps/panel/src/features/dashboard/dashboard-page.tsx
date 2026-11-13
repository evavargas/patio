import type { ChallengeId } from "@patio/contracts";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listChallengeTitles, statsChallenges, statsOverview, statsRegistrations } from "../../api/panel-api";
import { PageTitle } from "../../components/page-title";
import { ErrorState, ListSkeleton } from "../../components/query-states";
import { Card } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Table, Td, Th } from "../../components/ui/table";
import { formatDay } from "../../lib/format";
import { ChartCard } from "./chart-card";
import { StatsFilterBar, useStatsFilters } from "./stats-filters";

const shorten = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function Indicator({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-3xl font-bold">{value}</dd>
      {note && <dd className="text-sm text-text-muted">{note}</dd>}
    </Card>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { filters, setParam } = useStatsFilters();
  const overview = useQuery({ queryKey: ["stats", "overview", filters], queryFn: () => statsOverview(filters) });
  const regs = useQuery({ queryKey: ["stats", "registrations", filters], queryFn: () => statsRegistrations(filters) });
  const chall = useQuery({ queryKey: ["stats", "challenges", filters], queryFn: () => statsChallenges(filters) });
  const titles = useQuery({ queryKey: ["challenge-titles"], queryFn: listChallengeTitles, select: (d) => new Map(d.items.map((c) => [c.id, c.challenge.text])) });

  // `to` del servidor es AYER: el selector no deja pasar de ahi.
  const yesterday = overview.data?.to;
  const o = overview.data;

  const nameOf = (id: ChallengeId) => titles.data?.get(id) ?? id.slice(0, 8);
  // Recharts usa la categoria como clave: dos desafios con el mismo texto necesitan etiquetas distintas.
  const labelOf = (id: ChallengeId) => {
    const text = nameOf(id);
    const dup = chall.data?.items.filter((c) => shorten(nameOf(c.challengeId)) === shorten(text)).length ?? 0;
    return dup > 1 ? `${shorten(text, 18)} (${id.slice(0, 4)})` : shorten(text);
  };
  const peak = <T extends { date: string }>(items: T[], pick: (i: T) => number) =>
    items.reduce<T | null>((best, i) => (best === null || pick(i) > pick(best) ? i : best), null);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t("nav.dashboard")}</PageTitle>

      <p className="flex items-start gap-2 rounded-lg bg-info-soft p-3 font-medium">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-info" />
        <span>{yesterday ? t("dashboard.untilYesterdayOn", { date: formatDay(yesterday, true) }) : t("dashboard.untilYesterday")}</span>
      </p>

      <StatsFilterBar filters={filters} setParam={setParam} firstDay={overview.data?.from} lastDay={yesterday} />

      {overview.isPending && (
        <div role="status" aria-label={t("states.loading")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}
      {overview.isError && <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />}
      {o && (
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Indicator label={t("dashboard.totalPlayers")} value={o.totalPlayers} />
          <Indicator label={t("dashboard.newPlayers")} value={o.newPlayers} />
          <Indicator label={t("dashboard.enteredLastDay")} value={o.enteredOnLastDay} />
          <Indicator label={t("dashboard.groupsCreated")} value={o.groupsCreated} />
          <Indicator label={t("dashboard.resultsLastDay")} value={o.resultsOnLastDay} note={t("dashboard.resultsLastDayNote", { count: o.withResultOnLastDay })} />
        </dl>
      )}

      {o && regs.data && chall.data && (
        <div className="grid gap-6 xl:grid-cols-2">
          <ChartCard
            title={t("dashboard.registrationsTitle")}
            xKey="day"
            xLabel={t("common.date")}
            tickFormat={String}
            series={[{ key: "count", label: t("dashboard.registrations") }]}
            data={regs.data.items.map((i) => ({ day: formatDay(i.date), dayFull: formatDay(i.date, true), count: i.count }))}
            summary={(() => {
              const best = peak(regs.data.items, (i) => i.count);
              return best
                ? t("dashboard.registrationsSummary", { total: regs.data.items.reduce((s, i) => s + i.count, 0), days: regs.data.items.length, max: best.count, date: formatDay(best.date, true) })
                : t("dashboard.noData");
            })()}
          />
          <ChartCard
            title={t("dashboard.dailyTitle")}
            xKey="day"
            xLabel={t("common.date")}
            series={[
              { key: "entered", label: t("dashboard.entered") },
              { key: "withResult", label: t("dashboard.withResult") },
            ]}
            data={o.daily.map((d) => ({ day: formatDay(d.date), dayFull: formatDay(d.date, true), entered: d.entered, withResult: d.withResult }))}
            summary={t("dashboard.dailySummary", { entered: o.daily.reduce((s, d) => s + d.entered, 0), withResult: o.daily.reduce((s, d) => s + d.withResult, 0), days: o.daily.length })}
          />
          <ChartCard
            title={t("dashboard.levelsTitle")}
            xKey="level"
            xLabel={t("players.level")}
            series={[{ key: "count", label: t("dashboard.playersCount") }]}
            data={o.playersByLevel.map((l) => ({ level: l.level, count: l.count }))}
            tickFormat={(v) => t("dashboard.levelN", { level: v })}
            summary={t("dashboard.levelsSummary", { levels: o.playersByLevel.length, total: o.playersByLevel.reduce((s, l) => s + l.count, 0) })}
          />
          <ChartCard
            title={t("dashboard.challengesTitle")}
            horizontal
            xKey="name"
            xLabel={t("dashboard.challenge")}
            series={[{ key: "achieved", label: t("dashboard.achieved") }]}
            data={chall.data.items.map((c) => ({ name: labelOf(c.challengeId), nameFull: nameOf(c.challengeId), achieved: c.achieved }))}
            summary={t("dashboard.challengesSummary", { count: chall.data.items.length, total: chall.data.items.reduce((s, c) => s + c.achieved, 0) })}
          />
          <ChartCard
            title={t("dashboard.durationTitle")}
            horizontal
            xKey="name"
            xLabel={t("dashboard.challenge")}
            series={[{ key: "seconds", label: t("dashboard.avgSeconds") }]}
            data={chall.data.items.map((c) => ({ name: labelOf(c.challengeId), nameFull: nameOf(c.challengeId), seconds: Math.round(c.avgDurationMs / 1000) }))}
            summary={t("dashboard.durationSummary", { count: chall.data.items.length })}
          />
          <Card className="flex flex-col gap-3 xl:col-span-2">
            <h3 className="text-lg font-semibold">{t("dashboard.byDayTitle")}</h3>
            <p>{t("dashboard.byDaySummary")}</p>
            {chall.data.items.length === 0 ? (
              <p className="text-text-muted">{t("dashboard.noData")}</p>
            ) : (
              <Table caption={t("dashboard.byDayTitle")}>
                <thead>
                  <tr>
                    <Th>{t("dashboard.challenge")}</Th>
                    {o.daily.map((d) => (
                      <Th key={d.date}>{formatDay(d.date)}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chall.data.items.map((c) => (
                    <tr key={c.challengeId}>
                      <Td>{nameOf(c.challengeId)}</Td>
                      {/* byDay solo trae los dias con logros: los demas son 0 */}
                      {o.daily.map((d) => (
                        <Td key={d.date}>{c.byDay.find((b) => b.date === d.date)?.achieved ?? 0}</Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      )}
      {(regs.isPending || chall.isPending) && o && <ListSkeleton rows={3} />}
      {(regs.isError || chall.isError) && <ErrorState error={regs.error ?? chall.error} onRetry={() => { void regs.refetch(); void chall.refetch(); }} />}
    </div>
  );
}
