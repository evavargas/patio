import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import type { Filter } from "mongodb";
import { DatabaseService } from "../database/database.service.ts";

export interface PlayerDoc {
  _id: string;
  nickname: string;
  groupId: string | null;
  tokenHash: string;
  recoveryHash: string;
  score: number;
  countsByDifficulty: Record<string, number>;
  countsByFamily: Record<string, number>;
  /** Claves `<dificultad>:<familia>`. Hace falta para los requisitos de nivel (doc 09: "3 de Resolver dificultad 3"). */
  countsByDifficultyFamily?: Record<string, number>;
  /** Derivado. Nunca sale en `/v1`. */
  level: number;
  termsVersion: string;
  termsAcceptedAt: Date;
  createdAt: Date;
  lastActiveAt: Date;
}

/** Lo que el panel puede ver de un player: nunca hashes. */
export type PlayerPanelDoc = Pick<PlayerDoc, "_id" | "nickname" | "groupId" | "level" | "score" | "countsByDifficulty" | "countsByFamily" | "createdAt" | "lastActiveAt">;
const PANEL_PROJECTION = { nickname: 1, groupId: 1, level: 1, score: 1, countsByDifficulty: 1, countsByFamily: 1, createdAt: 1, lastActiveAt: 1 } as const;

/** Doc 04: `players`. Indices: unicos `tokenHash` y `recoveryHash`; {groupId, createdAt}; {createdAt}. */
@Injectable()
export class PlayersRepository implements OnModuleInit {
  private readonly collection;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.collection = database.db.collection<PlayerDoc>("players");
  }

  async onModuleInit(): Promise<void> {
    await this.collection.createIndexes([
      { key: { tokenHash: 1 }, unique: true },
      { key: { recoveryHash: 1 }, unique: true },
      { key: { groupId: 1, createdAt: 1 } },
      { key: { createdAt: 1 } },
    ]);
  }

  /** 1 escritura. */
  async insert(player: PlayerDoc): Promise<void> {
    await this.collection.insertOne(player);
  }

  /** 1 escritura. No falla si ya no existe. */
  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id });
  }

  /** 1 lectura por {groupId, createdAt}. */
  countInGroup(groupId: string): Promise<number> {
    return this.collection.countDocuments({ groupId });
  }

  /** 1 lectura por el indice unico `tokenHash`. Solo lo que el player propio puede ver. */
  findByTokenHash(tokenHash: string): Promise<Pick<PlayerDoc, "_id" | "nickname" | "score" | "tokenHash"> | null> {
    return this.collection.findOne({ tokenHash }, { projection: { nickname: 1, score: 1, tokenHash: 1 } });
  }

  /** 1 update atomico por `recoveryHash`: guarda el hash del token nuevo y descarta el anterior. null si el codigo no existe. */
  replaceTokenByRecoveryHash(recoveryHash: string, tokenHash: string): Promise<Pick<PlayerDoc, "_id" | "nickname"> | null> {
    return this.collection.findOneAndUpdate(
      { recoveryHash },
      { $set: { tokenHash } },
      { returnDocument: "after", projection: { nickname: 1 } },
    );
  }

  /** 1 update atomico por `_id`. Devuelve null si el player ya no existe. */
  touch(playerId: string, now: Date): Promise<Pick<PlayerDoc, "groupId" | "score"> | null> {
    return this.collection.findOneAndUpdate({ _id: playerId }, { $set: { lastActiveAt: now } }, { returnDocument: "after", projection: { groupId: 1, score: 1 } });
  }

  /** 1 update atomico: suma puntos y conteos y devuelve el estado YA sumado (base para evaluar el nivel). */
  addResult(playerId: string, inc: Record<string, number>): Promise<Pick<PlayerDoc, "score" | "level" | "countsByDifficulty" | "countsByDifficultyFamily"> | null> {
    return this.collection.findOneAndUpdate({ _id: playerId }, { $inc: inc }, { returnDocument: "after", projection: { score: 1, level: 1, countsByDifficulty: 1, countsByDifficultyFamily: 1 } });
  }

  /** 1 escritura. `$max`: el nivel solo sube, aun con dos logros aplicandose a la vez. */
  async raiseLevel(playerId: string, level: number): Promise<void> {
    await this.collection.updateOne({ _id: playerId }, { $max: { level } });
  }

  /** 1 lectura por _id (paginacion por cursor). `filter` incluye el alcance. Pide uno de mas para saber si hay otra pagina. */
  listPanel(filter: Filter<PlayerDoc>, after: string | undefined, limit: number): Promise<PlayerPanelDoc[]> {
    const query: Filter<PlayerDoc> = after === undefined ? filter : { $and: [filter, { _id: { $gt: after } }] };
    return this.collection.find(query, { projection: PANEL_PROJECTION }).sort({ _id: 1 }).limit(limit + 1).toArray();
  }

  /** 1 lectura. */
  findPanel(id: string): Promise<PlayerPanelDoc | null> {
    return this.collection.findOne({ _id: id }, { projection: PANEL_PROJECTION });
  }

  /** 1 lectura: grupo actual de varios players. */
  findGroups(ids: string[]): Promise<Pick<PlayerDoc, "_id" | "groupId">[]> {
    return this.collection.find({ _id: { $in: ids } }, { projection: { groupId: 1 } }).toArray();
  }

  /** 1 escritura. */
  async setNickname(id: string, nickname: string): Promise<void> {
    await this.collection.updateOne({ _id: id }, { $set: { nickname } });
  }

  /** 1 escritura: el hash viejo deja de servir, el token en uso no se toca. */
  async setRecoveryHash(id: string, recoveryHash: string): Promise<boolean> {
    return (await this.collection.updateOne({ _id: id }, { $set: { recoveryHash } })).matchedCount === 1;
  }

  /** 1 escritura. */
  async setGroup(ids: string[], groupId: string | null): Promise<void> {
    await this.collection.updateMany({ _id: { $in: ids } }, { $set: { groupId } });
  }

  /** 1 escritura: los players de un grupo eliminado quedan sin grupo. */
  async clearGroup(groupId: string): Promise<void> {
    await this.collection.updateMany({ groupId }, { $set: { groupId: null } });
  }

  /** 1 lectura (agregacion sobre {groupId, createdAt}): jugadores por grupo. */
  async countByGroup(groupIds: readonly string[] | null): Promise<Record<string, number>> {
    const rows = await this.collection
      .aggregate<{ _id: string; n: number }>([{ $match: groupIds === null ? { groupId: { $ne: null } } : { groupId: { $in: [...groupIds] } } }, { $group: { _id: "$groupId", n: { $sum: 1 } } }])
      .toArray();
    return Object.fromEntries(rows.map((r) => [r._id, r.n]));
  }
}
