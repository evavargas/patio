import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.ts";

export interface MembershipDoc {
  playerId: string;
  groupId: string;
  joinedAt: Date;
  leftAt?: Date;
}

/** Doc 04: `groupMemberships` (historial). Indices: {playerId, joinedAt} y {groupId, joinedAt}. */
@Injectable()
export class MembershipRepository implements OnModuleInit {
  private readonly collection;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.collection = database.db.collection<MembershipDoc>("groupMemberships");
  }

  async onModuleInit(): Promise<void> {
    await this.collection.createIndexes([{ key: { playerId: 1, joinedAt: 1 } }, { key: { groupId: 1, joinedAt: 1 } }]);
  }

  /** 1 escritura. */
  async open(row: MembershipDoc): Promise<void> {
    await this.collection.insertOne(row);
  }

  /** 1 escritura. Deshace `open` de un registro que no se completo. */
  async deleteByPlayer(playerId: string): Promise<void> {
    await this.collection.deleteMany({ playerId });
  }

  /** 1 escritura: cierra la fila vigente de varios players. Idempotente (solo toca las abiertas). */
  async closeOpen(playerIds: string[], now: Date): Promise<void> {
    await this.collection.updateMany({ playerId: { $in: playerIds }, leftAt: { $exists: false } }, { $set: { leftAt: now } });
  }

  /** 1 escritura: filas nuevas para varios players. */
  async openMany(rows: MembershipDoc[]): Promise<void> {
    if (rows.length > 0) await this.collection.insertMany(rows);
  }

  /** 1 escritura: cierra las filas vigentes de un grupo (el grupo se elimino). */
  async closeByGroup(groupId: string, now: Date): Promise<void> {
    await this.collection.updateMany({ groupId, leftAt: { $exists: false } }, { $set: { leftAt: now } });
  }

  /** 1 lectura. */
  countByPlayer(playerId: string): Promise<number> {
    return this.collection.countDocuments({ playerId });
  }
}
