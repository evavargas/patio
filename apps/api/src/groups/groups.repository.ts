import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.ts";

export interface GroupDoc {
  _id: string;
  name: string;
  code: string;
  ownerIds: string[];
  maxSize: number;
  active: boolean;
  createdAt: Date;
}

/** Doc 04: `groups`. Indices: unico `code` y {ownerIds}. */
@Injectable()
export class GroupsRepository implements OnModuleInit {
  private readonly collection;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.collection = database.db.collection<GroupDoc>("groups");
  }

  async onModuleInit(): Promise<void> {
    await this.collection.createIndexes([{ key: { code: 1 }, unique: true }, { key: { ownerIds: 1 } }]);
  }

  /** 1 lectura por el indice unico. */
  findByCode(code: string): Promise<GroupDoc | null> {
    return this.collection.findOne({ code });
  }
}
