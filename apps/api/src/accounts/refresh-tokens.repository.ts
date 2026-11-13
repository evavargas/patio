import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.ts";

/** Doc 04: `refreshTokens`. Solo el hash del token. `rotatedAt` presente = ya se uso (sirve para detectar reutilizacion). */
export interface RefreshTokenDoc {
  accountId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  rotatedAt?: Date;
}

/** Indices: unico `tokenHash`; TTL en `expiresAt`; `familyId` y `accountId` (propuesta: revocar sin recorrer la coleccion). */
@Injectable()
export class RefreshTokensRepository implements OnModuleInit {
  private readonly collection;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.collection = database.db.collection<RefreshTokenDoc>("refreshTokens");
  }

  async onModuleInit(): Promise<void> {
    await this.collection.createIndexes([
      { key: { tokenHash: 1 }, unique: true },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
      { key: { familyId: 1 } },
      { key: { accountId: 1 } },
    ]);
  }

  /** 1 escritura. */
  async insert(token: RefreshTokenDoc): Promise<void> {
    await this.collection.insertOne(token);
  }

  /**
   * 1 update atomico: marca como rotado un token vigente (no usado y no vencido). De dos pedidos con el mismo token gana UNO.
   * El TTL borra tarde (~60 s): por eso se compara `expiresAt` aca.
   */
  claim(tokenHash: string, now: Date): Promise<RefreshTokenDoc | null> {
    return this.collection.findOneAndUpdate({ tokenHash, rotatedAt: { $exists: false }, expiresAt: { $gt: now } }, { $set: { rotatedAt: now } }, { returnDocument: "after" });
  }

  /** 1 lectura por el indice unico. */
  findByHash(tokenHash: string): Promise<RefreshTokenDoc | null> {
    return this.collection.findOne({ tokenHash });
  }

  /** 1 escritura: revoca la familia entera (rotados y vigente). */
  async deleteFamily(familyId: string): Promise<void> {
    await this.collection.deleteMany({ familyId });
  }

  /** 1 escritura: revoca todas las sesiones de la cuenta. */
  async deleteByAccount(accountId: string): Promise<void> {
    await this.collection.deleteMany({ accountId });
  }
}
