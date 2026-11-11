import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
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
  /** Derivado. Nunca sale en `/v1`. */
  level: number;
  termsVersion: string;
  termsAcceptedAt: Date;
  createdAt: Date;
  lastActiveAt: Date;
}

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
}
