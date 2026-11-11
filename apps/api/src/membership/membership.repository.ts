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
}
