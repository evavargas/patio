import { Inject, Injectable } from "@nestjs/common";
import type { DayKey, StatsChallenges, StatsGroups, StatsOverview, StatsRankings, StatsRegistrations } from "@patio/contracts";
import { isDayKey } from "@patio/contracts";
import type { Document } from "mongodb";
import type { GroupScope } from "../groups/group-scope.ts";
import { Clock } from "../platform/clock.ts";
import { type AppConfig, CONFIG } from "../platform/config.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { challengeIdOf, groupIdOf, playerIdOf } from "../platform/ids.ts";
import { StatsRepository } from "./stats.repository.ts";

const MAX_RANGE_DAYS = 92;
const DEFAULT_RANGE_DAYS = 7;

export interface StatsQuery {
  from?: string;
  to?: string;
  groupId?: string;
}

interface Range {
  from: DayKey;
  to: DayKey;
  days: DayKey[];
}

/**
 * Estadisticas del panel: agregaciones directas sobre players, results y dayAccess, SIEMPRE con el alcance (propuesta: sin
 * coleccion `dailyStats` todavia). Los datos llegan hasta AYER y nunca incluyen hoy: `to` se recorta a ayer. Cada endpoint hace de
 * 2 a 5 agregaciones; con volumen chico (decenas de players) alcanza, con miles hay que pasar a `dailyStats` (doc 03).
 */
@Injectable()
export class StatsService {
  constructor(
    @Inject(CONFIG) private readonly config: Pick<AppConfig, "timeZone">,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(StatsRepository) private readonly repository: StatsRepository,
  ) {}

  async overview(scope: GroupScope, query: StatsQuery): Promise<StatsOverview> {
    const range = this.range(query);
    const gf = this.groupFilter(scope, query.groupId);
    const end = this.endOf(range.to);
    const dates = { date: { $gte: range.from, $lte: range.to } };
    const [totalPlayers, newPlayers, groupsCreated, entered, results, playersByLevel] = await Promise.all([
      this.repository.countPlayers({ ...gf, createdAt: { $lt: end } }),
      this.repository.countPlayers({ ...gf, createdAt: { $gte: this.clock.startOfDay(range.from), $lt: end } }),
      this.repository.countGroups({ ...this.groupsFilter(scope, query.groupId), createdAt: { $lt: end } }),
      this.repository.enteredByDay({ ...gf, ...dates }),
      this.repository.resultsByDay({ ...gf, ...dates }),
      this.repository.playersByLevel(gf),
    ]);
    const daily = range.days.map((date) => ({
      date,
      entered: entered.find((e) => e.date === date)?.entered ?? 0,
      withResult: results.find((r) => r.date === date)?.withResult ?? 0,
    }));
    const last = results.find((r) => r.date === range.to);
    return {
      from: range.from,
      to: range.to,
      totalPlayers,
      newPlayers,
      groupsCreated,
      enteredOnLastDay: daily.at(-1)?.entered ?? 0,
      withResultOnLastDay: last?.withResult ?? 0,
      resultsOnLastDay: last?.results ?? 0,
      daily,
      playersByLevel,
    };
  }

  async challenges(scope: GroupScope, query: StatsQuery): Promise<StatsChallenges> {
    const range = this.range(query);
    const rows = await this.repository.challengeResults({ ...this.groupFilter(scope, query.groupId), date: { $gte: range.from, $lte: range.to } });
    const byChallenge = new Map<string, typeof rows>();
    for (const row of rows) byChallenge.set(row.challengeId, [...(byChallenge.get(row.challengeId) ?? []), row]);
    return {
      from: range.from,
      to: range.to,
      items: [...byChallenge.entries()].map(([challengeId, list]) => {
        const achieved = list.reduce((sum, r) => sum + r.achieved, 0);
        const duration = list.reduce((sum, r) => sum + r.totalDurationMs, 0);
        return {
          challengeId: challengeIdOf(challengeId),
          achieved,
          avgDurationMs: achieved === 0 ? 0 : Math.round(duration / achieved),
          byDay: list.filter((r) => isDayKey(r.date)).map((r) => ({ date: this.clock.dayKey(r.date), achieved: r.achieved })),
        };
      }),
    };
  }

  async registrations(scope: GroupScope, query: StatsQuery): Promise<StatsRegistrations> {
    const range = this.range(query);
    const rows = await this.repository.registrationsByDay({ ...this.groupFilter(scope, query.groupId), createdAt: { $gte: this.clock.startOfDay(range.from), $lt: this.endOf(range.to) } }, this.config.timeZone);
    return { from: range.from, to: range.to, items: range.days.map((date) => ({ date, count: rows.find((r) => r.date === date)?.count ?? 0 })) };
  }

  async groups(scope: GroupScope, query: StatsQuery): Promise<StatsGroups> {
    const range = this.range(query);
    const dates = { date: { $gte: range.from, $lte: range.to } };
    const groups = await this.repository.groups(this.groupsFilter(scope, query.groupId));
    const ids = groups.map((g) => g._id);
    const inGroups = { groupId: { $in: ids } };
    const [counts, active, results] = await Promise.all([
      this.repository.playerCounts(inGroups),
      this.repository.activePlayersByGroup({ ...inGroups, ...dates }),
      this.repository.resultsByGroup({ ...inGroups, ...dates }),
    ]);
    return {
      from: range.from,
      to: range.to,
      items: groups.map((g) => ({ groupId: groupIdOf(g._id), name: g.name, playerCount: counts.get(g._id) ?? 0, maxSize: g.maxSize, activePlayers: active.get(g._id) ?? 0, results: results.get(g._id) ?? 0 })),
    };
  }

  /** Dos listas por grupo. Los players sin grupo no entran. Solo para el panel (nunca al juego). */
  async rankings(scope: GroupScope, query: StatsQuery): Promise<StatsRankings> {
    const range = this.range(query);
    const groups = await this.repository.groups(this.groupsFilter(scope, query.groupId));
    const ids = groups.map((g) => g._id);
    const dates = { date: { $gte: range.from, $lte: range.to }, playerId: { $exists: true } };
    const [players, commitment, achieved] = await Promise.all([
      this.repository.playersOf(ids),
      this.repository.commitment({ groupId: { $in: ids }, ...dates }),
      this.repository.achievedByPlayer({ groupId: { $in: ids }, ...dates }),
    ]);
    const commit = new Map(commitment.map((c) => [c.playerId, c]));
    return {
      from: range.from,
      to: range.to,
      groups: groups.map((g) => {
        const members = players.filter((p) => p.groupId === g._id);
        return {
          groupId: groupIdOf(g._id),
          name: g.name,
          commitment: members
            .map((p) => ({ playerId: playerIdOf(p._id), nickname: p.nickname, daysEntered: commit.get(p._id)?.daysEntered ?? 0, achieved: achieved.get(p._id) ?? 0, available: commit.get(p._id)?.available ?? 0 }))
            .sort((a, b) => b.achieved - a.achieved || b.daysEntered - a.daysEntered),
          progress: members.map((p) => ({ playerId: playerIdOf(p._id), nickname: p.nickname, level: p.level, score: p.score })).sort((a, b) => b.level - a.level || b.score - a.score),
        };
      }),
    };
  }

  /** `to` nunca pasa de ayer; por defecto 7 dias terminando ayer; maximo 92 dias. */
  private range(query: StatsQuery): Range {
    const yesterday = this.clock.previousDay(this.clock.today());
    const asDay = (value: string | undefined): DayKey | undefined => {
      if (value === undefined) return undefined;
      if (!isDayKey(value)) throw new DomainException("VALIDATION_FAILED", 400);
      return value;
    };
    const requestedTo = asDay(query.to);
    const to = requestedTo === undefined || requestedTo > yesterday ? yesterday : requestedTo;
    let from = asDay(query.from);
    if (from === undefined) {
      from = to;
      for (let i = 1; i < DEFAULT_RANGE_DAYS; i++) from = this.clock.previousDay(from);
    }
    const span = this.clock.daysBetween(from, to) + 1;
    if (span < 1 || span > MAX_RANGE_DAYS) throw new DomainException("VALIDATION_FAILED", 400);
    const days: DayKey[] = [];
    for (let d = from; d <= to; d = this.clock.nextDay(d)) days.push(d);
    return { from, to, days };
  }

  private endOf(day: DayKey): Date {
    return this.clock.startOfDay(this.clock.nextDay(day));
  }

  /** Filtro sobre campos `groupId` (players, dayAccess, results). Un `groupId` pedido debe estar en el alcance. */
  private groupFilter(scope: GroupScope, groupId: string | undefined): Document {
    if (groupId === undefined) return scope.filter("groupId");
    if (!scope.allows(groupId)) throw new DomainException("FORBIDDEN_SCOPE", 403);
    return { groupId };
  }

  /** Igual, sobre `_id` de la coleccion groups. */
  private groupsFilter(scope: GroupScope, groupId: string | undefined): Document {
    if (groupId === undefined) return scope.filter("_id");
    if (!scope.allows(groupId)) throw new DomainException("FORBIDDEN_SCOPE", 403);
    return { _id: groupId };
  }
}
