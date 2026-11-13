import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import type { PanelDaySet } from "@patio/contracts";
import { listDaySets, statsOverview } from "../../api/panel-api";
import { useSession } from "../../auth/session-store";
import { PageTitle } from "../../components/page-title";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/query-states";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { cn } from "../../lib/cn";
import { formatDay } from "../../lib/format";
import { useGroups } from "../groups/use-groups";
import { addDays, addMonths, firstOfMonth, isDayKey, isMonth, lastOfMonth, monthOf, monthWeeks } from "./calendar";
import { DaySetEditor } from "./day-set-editor";

const WEEKDAYS = ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06", "2024-01-07"]; // lunes a domingo

export function DaySetsPage() {
  const { t, i18n } = useTranslation();
  const isAdmin = useSession((s) => s.account?.role === "administrator");
  const [params, setParams] = useSearchParams();
  const groups = useGroups();
  const groupList = groups.data ?? [];
  // "Hoy" es el dia siguiente al ultimo dia cerrado que informa el servidor (el panel no tiene reloj propio).
  const todayQ = useQuery({ queryKey: ["stats", "overview", {}], queryFn: () => statsOverview({}), select: (d) => addDays(d.to, 1) });
  const today = todayQ.data;

  // El moderator no ve el set general (es del administrator).
  const group = params.get("group") ?? (isAdmin ? "general" : (groupList[0]?.id ?? ""));
  const monthParam = params.get("month");
  const month = isMonth(monthParam) ? monthParam : today ? monthOf(today) : null;
  const dateParam = params.get("date");
  const date = isDayKey(dateParam) ? dateParam : null;

  const setParam = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "") next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  const goMonth = (n: number) => {
    if (month === null) return;
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("month", addMonths(month, n));
      next.delete("date");
      return next;
    }, { replace: true });
  };

  const q = useQuery({
    queryKey: ["day-sets", "list", { group, month }],
    queryFn: () => listDaySets({ from: firstOfMonth(month ?? ""), to: lastOfMonth(month ?? ""), groupId: group }),
    enabled: month !== null && group !== "",
    select: (d) => d.items,
  });
  const byDate = new Map<string, PanelDaySet>(q.data?.map((s) => [s.date, s]));
  const selectedSet = date ? byDate.get(date) : undefined;

  const monthLabel = month ? new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${firstOfMonth(month)}T00:00:00Z`)) : "";
  const weekdayLabel = (d: string, long: boolean) => new Intl.DateTimeFormat(i18n.language, { weekday: long ? "long" : "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

  const loading = groups.isPending || todayQ.isPending;
  const failed = groups.error ?? todayQ.error;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t("nav.daySets")}</PageTitle>
      {loading && <ListSkeleton />}
      {failed && <ErrorState error={failed} onRetry={() => { void groups.refetch(); void todayQ.refetch(); }} />}
      {!loading && !failed && groupList.length === 0 && !isAdmin && <EmptyState text={t("daySets.noGroups")} />}
      {!loading && !failed && month !== null && today !== undefined && (isAdmin || groupList.length > 0) && (
        <>
          <div className="flex max-w-md flex-col gap-1">
            <Label htmlFor="ds-group">{t("players.group")}</Label>
            <Select id="ds-group" value={group} onChange={(e) => setParams({ group: e.target.value, month }, { replace: true })}>
              {isAdmin && <option value="general">{t("daySets.general")}</option>}
              {groupList.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>

          <section aria-labelledby="ds-cal" className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" aria-label={t("daySets.prevMonth")} onClick={() => goMonth(-1)}>
                <ChevronLeft aria-hidden="true" className="size-5" />
              </Button>
              <h2 id="ds-cal" className="min-w-40 text-center text-xl font-bold first-letter:uppercase" aria-live="polite">
                {monthLabel}
              </h2>
              <Button variant="outline" aria-label={t("daySets.nextMonth")} onClick={() => goMonth(1)}>
                <ChevronRight aria-hidden="true" className="size-5" />
              </Button>
            </div>
            {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
            {q.isPending && <ListSkeleton rows={4} />}
            {q.isSuccess && (
              <>
                {q.data.length === 0 && <p className="text-text-muted">{t("daySets.monthEmpty")}</p>}
                <table className="w-full table-fixed border-collapse">
                  <caption className="sr-only">{t("daySets.calendarCaption", { month: monthLabel })}</caption>
                  <thead>
                    <tr>
                      {WEEKDAYS.map((d) => (
                        <th key={d} scope="col" className="p-1 text-sm font-semibold capitalize">
                          <abbr title={weekdayLabel(d, true)} className="no-underline">
                            {weekdayLabel(d, false)}
                          </abbr>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthWeeks(month).map((week, w) => (
                      <tr key={w}>
                        {week.map((d, i) => {
                          if (d === null) return <td key={i} />;
                          const s = byDate.get(d);
                          const state = s ? (s.lockedAt ? "locked" : s.status) : "none";
                          return (
                            <td key={d} className="p-0.5 align-top">
                              <button
                                type="button"
                                aria-pressed={date === d}
                                aria-label={`${formatDay(d, true)}: ${t(`daySets.state.${state}`)}${d === today ? `, ${t("daySets.todayMark")}` : ""}`}
                                onClick={() => setParam("date", d)}
                                className={cn(
                                  "flex min-h-touch w-full flex-col items-start rounded-md border-2 p-1 text-left",
                                  date === d ? "border-primary bg-primary-soft" : "border-border bg-surface-raised",
                                  d < today && "text-text-muted",
                                )}
                              >
                                <span className="font-semibold">{Number(d.slice(8))}</span>
                                <span className="text-xs">{state === "none" ? "" : t(`daySets.state.${state}`)}</span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>

          {date === null && <p className="text-text-muted">{t("daySets.pickDay")}</p>}
          {date !== null && q.isSuccess && (
            <DaySetEditor
              key={`${group}|${date}|${selectedSet?.id}|${selectedSet?.status}|${selectedSet?.lockedAt}|${selectedSet?.challengeIds.join()}`}
              date={date}
              groupId={groupList.find((g) => g.id === group)?.id ?? null}
              set={selectedSet}
              today={today}
              isAdmin={isAdmin}
              onDeleted={() => setParam("date", "")}
            />
          )}
        </>
      )}
    </div>
  );
}
