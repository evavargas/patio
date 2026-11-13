import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.ts";

/** Doc 04: `accountInvitations`. Solo el hash del token. Solo se invita como moderator. */
export interface InvitationDoc {
  _id: string;
  email: string;
  tokenHash: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
}

/** Indices: unico `tokenHash`, unico `email` (una invitacion vigente por correo), TTL en `expiresAt`. */
@Injectable()
export class InvitationsRepository implements OnModuleInit {
  private readonly collection;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.collection = database.db.collection<InvitationDoc>("accountInvitations");
  }

  async onModuleInit(): Promise<void> {
    await this.collection.createIndexes([
      { key: { tokenHash: 1 }, unique: true },
      { key: { email: 1 }, unique: true },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]);
  }

  /** 1 escritura (upsert por correo): reinvitar reemplaza la invitacion anterior y deja de servir su enlace. */
  async upsertForEmail(doc: Omit<InvitationDoc, "acceptedAt">): Promise<void> {
    const { _id, email, ...rest } = doc;
    await this.collection.updateOne({ email }, { $set: rest, $setOnInsert: { _id }, $unset: { acceptedAt: "" } }, { upsert: true });
  }

  /** 1 update atomico: reclama una invitacion vigente (gana UNO). El TTL borra tarde: se compara `expiresAt`. */
  claim(tokenHash: string, now: Date): Promise<InvitationDoc | null> {
    return this.collection.findOneAndUpdate({ tokenHash, acceptedAt: { $exists: false }, expiresAt: { $gt: now } }, { $set: { acceptedAt: now } }, { returnDocument: "after" });
  }

  /** 1 escritura. Idempotente. */
  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id });
  }
}
