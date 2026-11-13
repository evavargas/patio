import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.ts";

/**
 * Doc 04: `results`. Fuente de verdad: puntaje, conteos y nivel del player se pueden recalcular desde aca, por eso cada
 * logro guarda `points`, `difficulty` y `family` (propuesta, doc 04 no los lista). `claimedAt` (propuesta) es la reserva de
 * quien lo esta aplicando: evita que dos pedidos lo apliquen a la vez.
 */
export interface ResultDoc {
  _id: string;
  eventId: string;
  playerId: string;
  challengeId: string;
  daySetId: string;
  date: string;
  groupId: string | null;
  applied: boolean;
  claimedAt: Date;
  durationMs: number;
  points: number;
  difficulty: number;
  family?: string;
  createdAt: Date;
}

@Injectable()
export class ResultsRepository implements OnModuleInit {
  private readonly collection;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.collection = database.db.collection<ResultDoc>("results");
  }

  async onModuleInit(): Promise<void> {
    await this.collection.createIndexes([
      { key: { eventId: 1 }, unique: true },
      { key: { playerId: 1, daySetId: 1, challengeId: 1 }, unique: true },
      { key: { date: 1, groupId: 1 } },
    ]);
  }

  /** 1 escritura. false si choca con un indice unico (eventId o {playerId, daySetId, challengeId}). */
  async insert(doc: ResultDoc): Promise<boolean> {
    try {
      await this.collection.insertOne(doc);
      return true;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return false;
      throw error;
    }
  }

  /** 1 lectura por el indice unico. */
  findByKey(playerId: string, daySetId: string, challengeId: string): Promise<ResultDoc | null> {
    return this.collection.findOne({ playerId, daySetId, challengeId });
  }

  /** 1 update atomico (compara y cambia `claimedAt`): de varios pedidos que ven la misma reserva vencida, gana uno. */
  takeOver(id: string, seenClaimedAt: Date, now: Date): Promise<ResultDoc | null> {
    return this.collection.findOneAndUpdate({ _id: id, applied: false, claimedAt: seenClaimedAt }, { $set: { claimedAt: now } }, { returnDocument: "after" });
  }

  /** 1 escritura. */
  async markApplied(id: string): Promise<void> {
    await this.collection.updateOne({ _id: id }, { $set: { applied: true } });
  }

  /** 1 lectura. Desafios logrados por el player en un set. */
  async challengeIds(playerId: string, daySetId: string): Promise<string[]> {
    const docs = await this.collection.find({ playerId, daySetId }, { projection: { challengeId: 1 } }).toArray();
    return docs.map((d) => d.challengeId);
  }

  /** 1 escritura. Efecto de borrar un player. Idempotente. */
  async deleteByPlayer(playerId: string): Promise<void> {
    await this.collection.deleteMany({ playerId });
  }

  /** 1 lectura. */
  countByPlayer(playerId: string): Promise<number> {
    return this.collection.countDocuments({ playerId });
  }

  /** 1 lectura: logros de un player por dia en un rango. */
  achievedByDay(playerId: string, from: string, to: string): Promise<{ date: string; achieved: number }[]> {
    return this.collection
      .aggregate<{ date: string; achieved: number }>([{ $match: { playerId, date: { $gte: from, $lte: to } } }, { $group: { _id: "$date", achieved: { $sum: 1 } } }, { $project: { _id: 0, date: "$_id", achieved: 1 } }, { $sort: { date: 1 } }])
      .toArray();
  }
}
