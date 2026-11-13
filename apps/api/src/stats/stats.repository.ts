import { Inject, Injectable } from "@nestjs/common";
import type { Document } from "mongodb";
import { DatabaseService } from "../database/database.service.ts";

/** Agregaciones directas sobre players, results, dayAccess, daySets y groups. Sin `dailyStats` todavia (propuesta). */
@Injectable()
export class StatsRepository {
  private readonly db;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.db = database.db;
  }

  /** 1 agregacion por coleccion. Cada metodo recibe filtros ya armados con el alcance. */
  countPlayers(filter: Document): Promise<number> {
    return this.db.collection("players").countDocuments(filter);
  }

  countGroups(filter: Document): Promise<number> {
    return this.db.collection("groups").countDocuments(filter);
  }

  playersByLevel(filter: Document): Promise<{ level: number; count: number }[]> {
    return this.db
      .collection("players")
      .aggregate<{ level: number; count: number }>([{ $match: filter }, { $group: { _id: "$level", count: { $sum: 1 } } }, { $project: { _id: 0, level: "$_id", count: 1 } }, { $sort: { level: 1 } }])
      .toArray();
  }

  /** Jugadores que entraron por dia: accesos del rango (uno por player y dia). */
  enteredByDay(filter: Document): Promise<{ date: string; entered: number }[]> {
    return this.db
      .collection("dayAccess")
      .aggregate<{ date: string; entered: number }>([{ $match: filter }, { $group: { _id: "$date", entered: { $sum: 1 } } }, { $project: { _id: 0, date: "$_id", entered: 1 } }, { $sort: { date: 1 } }])
      .toArray();
  }

  /** Jugadores distintos con al menos un logro, y logros, por dia. */
  resultsByDay(filter: Document): Promise<{ date: string; withResult: number; results: number }[]> {
    return this.db
      .collection("results")
      .aggregate<{ date: string; withResult: number; results: number }>([
        { $match: filter },
        { $group: { _id: { date: "$date", playerId: "$playerId" }, n: { $sum: 1 } } },
        { $group: { _id: "$_id.date", withResult: { $sum: 1 }, results: { $sum: "$n" } } },
        { $project: { _id: 0, date: "$_id", withResult: 1, results: 1 } },
        { $sort: { date: 1 } },
      ])
      .toArray();
  }

  /** Logros por desafio y dia, con duracion media. */
  challengeResults(filter: Document): Promise<{ challengeId: string; date: string; achieved: number; totalDurationMs: number }[]> {
    return this.db
      .collection("results")
      .aggregate<{ challengeId: string; date: string; achieved: number; totalDurationMs: number }>([
        { $match: filter },
        { $group: { _id: { challengeId: "$challengeId", date: "$date" }, achieved: { $sum: 1 }, totalDurationMs: { $sum: "$durationMs" } } },
        { $project: { _id: 0, challengeId: "$_id.challengeId", date: "$_id.date", achieved: 1, totalDurationMs: 1 } },
        { $sort: { challengeId: 1, date: 1 } },
      ])
      .toArray();
  }

  /** Altas por dia en la zona configurada. */
  registrationsByDay(filter: Document, timezone: string): Promise<{ date: string; count: number }[]> {
    return this.db
      .collection("players")
      .aggregate<{ date: string; count: number }>([
        { $match: filter },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone } }, count: { $sum: 1 } } },
        { $project: { _id: 0, date: "$_id", count: 1 } },
        { $sort: { date: 1 } },
      ])
      .toArray();
  }

  /** Jugadores distintos que entraron, por grupo. */
  async activePlayersByGroup(accessFilter: Document): Promise<Map<string, number>> {
    const rows = await this.db
      .collection("dayAccess")
      .aggregate<{ _id: string; n: number }>([{ $match: accessFilter }, { $group: { _id: { g: "$groupId", p: "$playerId" } } }, { $group: { _id: "$_id.g", n: { $sum: 1 } } }])
      .toArray();
    return new Map(rows.map((r) => [r._id, r.n]));
  }

  /** Logros por grupo. */
  async resultsByGroup(resultFilter: Document): Promise<Map<string, number>> {
    const rows = await this.db
      .collection("results")
      .aggregate<{ _id: string; n: number }>([{ $match: resultFilter }, { $group: { _id: "$groupId", n: { $sum: 1 } } }])
      .toArray();
    return new Map(rows.map((r) => [r._id, r.n]));
  }

  /** Jugadores por grupo. */
  async playerCounts(playerFilter: Document): Promise<Map<string, number>> {
    const rows = await this.db
      .collection("players")
      .aggregate<{ _id: string; n: number }>([{ $match: { ...playerFilter, groupId: { $ne: null } } }, { $group: { _id: "$groupId", n: { $sum: 1 } } }])
      .toArray();
    return new Map(rows.map((r) => [r._id, r.n]));
  }

  /** Compromiso: por player, dias que entro y desafios disponibles (suma de items de los sets que abrio). */
  commitment(accessFilter: Document): Promise<{ playerId: string; daysEntered: number; available: number }[]> {
    return this.db
      .collection("dayAccess")
      .aggregate<{ playerId: string; daysEntered: number; available: number }>([
        { $match: accessFilter },
        { $lookup: { from: "daySets", localField: "daySetId", foreignField: "_id", as: "set", pipeline: [{ $project: { n: { $size: { $ifNull: ["$items", []] } } } }] } },
        { $group: { _id: "$playerId", daysEntered: { $sum: 1 }, available: { $sum: { $ifNull: [{ $arrayElemAt: ["$set.n", 0] }, 0] } } } },
        { $project: { _id: 0, playerId: "$_id", daysEntered: 1, available: 1 } },
      ])
      .toArray();
  }

  /** Logros por player en el rango. */
  achievedByPlayer(filter: Document): Promise<Map<string, number>> {
    return this.db
      .collection("results")
      .aggregate<{ _id: string; n: number }>([{ $match: filter }, { $group: { _id: "$playerId", n: { $sum: 1 } } }])
      .toArray()
      .then((rows) => new Map(rows.map((r) => [r._id, r.n])));
  }

  groups(filter: Document): Promise<{ _id: string; name: string; maxSize: number }[]> {
    return this.db.collection<{ _id: string; name: string; maxSize: number }>("groups").find(filter, { projection: { name: 1, maxSize: 1 } }).sort({ name: 1 }).limit(500).toArray();
  }

  playersOf(groupIds: string[]): Promise<{ _id: string; nickname: string; groupId: string; level: number; score: number }[]> {
    return this.db
      .collection<{ _id: string; nickname: string; groupId: string; level: number; score: number }>("players")
      .find({ groupId: { $in: groupIds } }, { projection: { nickname: 1, groupId: 1, level: 1, score: 1 } })
      .limit(5000)
      .toArray();
  }
}
