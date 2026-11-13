import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import type { DayItem } from "@patio/contracts";
import type { Filter } from "mongodb";
import { DatabaseService } from "../database/database.service.ts";

/** Copia del desafio al publicar (doc 04). `version` y el resto de lo guardado no salen a `/v1`. */
export type StoredItem = DayItem & { version?: number };

export interface DaySetDoc {
  _id: string;
  date: string;
  /** null = set general. */
  groupId: string | null;
  status: "draft" | "published";
  items: StoredItem[];
  /** Lista del borrador (propuesta): `items` solo se llena al publicar. */
  challengeIds?: string[];
  lockedAt?: Date | null;
  timezone: string;
}

export interface DayAccessDoc {
  playerId: string;
  date: string;
  daySetId: string;
  groupId: string | null;
  createdAt: Date;
}

/** Doc 04: `daySets` (unico {date, groupId}) y `dayAccess` (unico {playerId, date}; {date, groupId}). */
@Injectable()
export class DaySetsRepository implements OnModuleInit {
  private readonly sets;
  private readonly access;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.sets = database.db.collection<DaySetDoc>("daySets");
    this.access = database.db.collection<DayAccessDoc>("dayAccess");
  }

  async onModuleInit(): Promise<void> {
    await this.sets.createIndexes([{ key: { date: 1, groupId: 1 }, unique: true }]);
    await this.access.createIndexes([{ key: { playerId: 1, date: 1 }, unique: true }, { key: { date: 1, groupId: 1 } }]);
  }

  /** 1 operacion atomica: busca el set PUBLICADO de (fecha, grupo), pone `lockedAt` solo si estaba vacio y devuelve el set YA bloqueado. */
  lockPublished(date: string, groupId: string | null, now: Date): Promise<DaySetDoc | null> {
    return this.sets.findOneAndUpdate({ date, groupId, status: "published" }, [{ $set: { lockedAt: { $ifNull: ["$lockedAt", now] } } }], { returnDocument: "after" });
  }

  /** Igual que `lockPublished` pero por id (el set fijado por un acceso). */
  lockById(id: string, now: Date): Promise<DaySetDoc | null> {
    return this.sets.findOneAndUpdate({ _id: id }, [{ $set: { lockedAt: { $ifNull: ["$lockedAt", now] } } }], { returnDocument: "after" });
  }

  /** 1 lectura, sin bloquear. */
  findSet(id: string): Promise<DaySetDoc | null> {
    return this.sets.findOne({ _id: id });
  }

  /** 1 lectura por el indice unico. */
  findAccess(playerId: string, date: string): Promise<DayAccessDoc | null> {
    return this.access.findOne({ playerId, date });
  }

  /** 1 escritura. false si ya existia (otro pedido del mismo player llego primero). */
  async insertAccess(doc: DayAccessDoc): Promise<boolean> {
    try {
      await this.access.insertOne(doc);
      return true;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return false;
      throw error;
    }
  }

  /** 1 escritura. Idempotente: apunta el acceso al set nuevo (el anterior fue eliminado). */
  async repointAccess(playerId: string, date: string, daySetId: string, groupId: string | null): Promise<void> {
    await this.access.updateOne({ playerId, date }, { $set: { daySetId, groupId } });
  }

  // ---- Panel ----

  /** 1 lectura por {date, groupId}. `filter` incluye el alcance. */
  list(filter: Filter<DaySetDoc>, from: string, to: string): Promise<DaySetDoc[]> {
    return this.sets.find({ $and: [filter, { date: { $gte: from, $lte: to } }] }).sort({ date: 1, groupId: 1 }).limit(500).toArray();
  }

  /** 1 lectura por el indice unico. */
  findByKey(date: string, groupId: string | null): Promise<DaySetDoc | null> {
    return this.sets.findOne({ date, groupId });
  }

  /** 1 escritura. false si ya existe un set para (fecha, grupo). */
  async insertDraft(doc: DaySetDoc): Promise<boolean> {
    try {
      await this.sets.insertOne(doc);
      return true;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return false;
      throw error;
    }
  }

  /** 1 escritura atomica, SOLO si `lockedAt` esta vacio. null = bloqueado o inexistente. Vuelve a borrador. */
  saveDraft(id: string, challengeIds: string[]): Promise<DaySetDoc | null> {
    return this.sets.findOneAndUpdate({ _id: id, lockedAt: null }, { $set: { challengeIds, status: "draft", items: [] } }, { returnDocument: "after" });
  }

  /** 1 escritura atomica, SOLO si `lockedAt` esta vacio. */
  publish(id: string, items: StoredItem[]): Promise<DaySetDoc | null> {
    return this.sets.findOneAndUpdate({ _id: id, lockedAt: null }, { $set: { status: "published", items } }, { returnDocument: "after" });
  }

  /** 1 escritura atomica, SOLO si `lockedAt` esta vacio. */
  unpublish(id: string): Promise<DaySetDoc | null> {
    return this.sets.findOneAndUpdate({ _id: id, lockedAt: null }, { $set: { status: "draft", items: [] } }, { returnDocument: "after" });
  }

  /** 1 escritura. Idempotente. */
  async deleteSet(id: string): Promise<void> {
    await this.sets.deleteOne({ _id: id });
  }

  /** 1 escritura: efecto de borrar un grupo. */
  async deleteByGroup(groupId: string): Promise<void> {
    await this.sets.deleteMany({ groupId });
  }

  /** 1 lectura: cuantos players ya abrieron el set. */
  countAccess(daySetId: string): Promise<number> {
    return this.access.countDocuments({ daySetId });
  }

  /** 1 lectura. */
  countSetsByGroup(groupId: string): Promise<number> {
    return this.sets.countDocuments({ groupId });
  }

  /** 1 escritura: efecto de borrar un player. */
  async deleteAccessByPlayer(playerId: string): Promise<void> {
    await this.access.deleteMany({ playerId });
  }

  /** 1 lectura. */
  countAccessByPlayer(playerId: string): Promise<number> {
    return this.access.countDocuments({ playerId });
  }
}
