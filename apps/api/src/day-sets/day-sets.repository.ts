import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import type { DayItem } from "@patio/contracts";
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
}
