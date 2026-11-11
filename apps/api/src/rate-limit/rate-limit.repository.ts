import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { MongoServerError } from "mongodb";
import { DatabaseService } from "../database/database.service.ts";

export interface RateLimitDoc {
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

/** Doc 04: `rateLimits` { key, count, windowStart, expiresAt }. Unico: key. TTL: expiresAt. */
@Injectable()
export class RateLimitRepository implements OnModuleInit {
  private readonly collection;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.collection = database.db.collection<RateLimitDoc>("rateLimits");
  }

  async onModuleInit(): Promise<void> {
    await this.collection.createIndexes([
      { key: { key: 1 }, unique: true },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]);
  }

  /**
   * 1 operacion atomica (upsert con pipeline): si la ventana vencio o no existe arranca otra con count 1, si no suma 1.
   * Devuelve el contador despues de sumar. El TTL borra tarde (hasta ~60 s), por eso se compara `expiresAt` aca.
   */
  async increment(key: string, now: Date, windowEnd: Date): Promise<number> {
    const pipeline = [
      { $set: { fresh: { $not: [{ $gt: ["$expiresAt", now] }] } } },
      {
        $set: {
          count: { $cond: ["$fresh", 1, { $add: ["$count", 1] }] },
          windowStart: { $cond: ["$fresh", now, "$windowStart"] },
          expiresAt: { $cond: ["$fresh", windowEnd, "$expiresAt"] },
        },
      },
      { $unset: "fresh" },
    ];
    // Dos upserts simultaneos de una clave nueva: uno pierde con duplicado en el indice unico y reintenta (ya existe).
    for (let attempt = 0; ; attempt++) {
      try {
        const doc = await this.collection.findOneAndUpdate({ key }, pipeline, { upsert: true, returnDocument: "after" });
        return doc?.count ?? 1;
      } catch (error) {
        if (!(error instanceof MongoServerError && error.code === 11000) || attempt >= 2) throw error;
      }
    }
  }

  /** 1 lectura, sin contar. */
  async current(key: string, now: Date): Promise<number> {
    const doc = await this.collection.findOne({ key, expiresAt: { $gt: now } });
    return doc?.count ?? 0;
  }
}
