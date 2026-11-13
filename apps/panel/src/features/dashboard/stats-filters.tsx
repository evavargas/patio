import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import type { StatsFilters } from "../../api/panel-api";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { useGroups } from "../groups/use-groups";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Filtros de estadisticas en la URL (group, from, to). */
export function useStatsFilters() {
  const [params, setParams] = useSearchParams();
  const from = params.get("from");
  const to = params.get("to");
  const filters: StatsFilters = {
    groupId: params.get("group") ?? undefined,
    from: from && DAY.test(from) ? from : undefined,
    to: to && DAY.test(to) ? to : undefined,
  };
  const setParam = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "") next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  return { filters, setParam };
}

/** `lastDay` = ultimo dia con datos (AYER, lo dice el servidor): el selector no deja elegir hoy ni despues. */
export function StatsFilterBar({ filters, setParam, firstDay, lastDay }: { filters: StatsFilters; setParam: (k: string, v: string) => void; firstDay?: string; lastDay?: string }) {
  const { t } = useTranslation();
  const groups = useGroups();
  return (
    <form role="search" aria-label={t("dashboard.filters")} className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
      <div className="flex flex-col gap-1">
        <Label htmlFor="s-group">{t("players.group")}</Label>
        <Select id="s-group" value={filters.groupId ?? ""} onChange={(e) => setParam("group", e.target.value)}>
          <option value="">{t("players.allGroups")}</option>
          {groups.data?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="s-from">{t("dashboard.from")}</Label>
        <Input id="s-from" type="date" value={filters.from ?? firstDay ?? ""} max={lastDay} onChange={(e) => setParam("from", e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="s-to">{t("dashboard.to")}</Label>
        <Input id="s-to" type="date" value={filters.to ?? lastDay ?? ""} max={lastDay} onChange={(e) => setParam("to", e.target.value)} />
      </div>
    </form>
  );
}
