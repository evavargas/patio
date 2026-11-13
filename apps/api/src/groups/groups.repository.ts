import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import type { Filter } from "mongodb";
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

  /** 1 lectura. */
  findById(id: string): Promise<GroupDoc | null> {
    return this.collection.findOne({ _id: id });
  }

  /** 1 lectura: ids de los grupos de un dueño (por {ownerIds}). */
  async idsOwnedBy(accountId: string): Promise<string[]> {
    return (await this.collection.find({ ownerIds: accountId }, { projection: { _id: 1 } }).toArray()).map((g) => g._id);
  }

  /** 1 lectura. `filter` viene del alcance. */
  list(filter: Filter<GroupDoc>): Promise<GroupDoc[]> {
    return this.collection.find(filter).sort({ name: 1 }).limit(500).toArray();
  }

  /** 1 escritura. false si el codigo ya existe. */
  async insert(doc: GroupDoc): Promise<boolean> {
    return this.writeUnique(() => this.collection.insertOne(doc));
  }

  /** 1 escritura. */
  async update(id: string, patch: Partial<Omit<GroupDoc, "_id">>): Promise<GroupDoc | null> {
    return this.collection.findOneAndUpdate({ _id: id }, { $set: patch }, { returnDocument: "after" });
  }

  /** 1 escritura. false si el codigo nuevo choca con otro. */
  async setCode(id: string, code: string): Promise<boolean> {
    return this.writeUnique(() => this.collection.updateOne({ _id: id }, { $set: { code } }));
  }

  /** 1 escritura. No falla si ya no existe. */
  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id });
  }

  /** 1 escritura: quita a la cuenta de `ownerIds` en todos sus grupos. */
  async removeOwner(accountId: string): Promise<void> {
    await this.collection.updateMany({ ownerIds: accountId }, { $pull: { ownerIds: accountId } });
  }

  private async writeUnique(write: () => Promise<unknown>): Promise<boolean> {
    try {
      await write();
      return true;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return false;
      throw error;
    }
  }
}
