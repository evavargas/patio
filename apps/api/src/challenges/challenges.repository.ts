import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import type { Challenge } from "@patio/contracts";
import type { Document, Filter } from "mongodb";
import { DatabaseService } from "../database/database.service.ts";

/** Doc 04: `challenges`. `version` sube en cada edicion; el contenido del desafio va plano. */
export interface ChallengeDoc {
  _id: string;
  authorId: string;
  status: "active" | "archived";
  version: number;
  text: string;
  mechanic: Challenge["mechanic"];
  difficulty: number;
  points?: number;
  family?: NonNullable<Challenge["family"]>;
  assets: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Indices: {authorId}, {status}. */
@Injectable()
export class ChallengesRepository implements OnModuleInit {
  private readonly collection;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.collection = database.db.collection<ChallengeDoc>("challenges");
  }

  async onModuleInit(): Promise<void> {
    await this.collection.createIndexes([{ key: { authorId: 1 } }, { key: { status: 1 } }]);
  }

  /** 1 escritura. */
  async insert(doc: ChallengeDoc): Promise<void> {
    await this.collection.insertOne(doc);
  }

  /** 1 lectura. */
  findById(id: string): Promise<ChallengeDoc | null> {
    return this.collection.findOne({ _id: id });
  }

  /** 1 lectura. */
  findMany(ids: string[]): Promise<ChallengeDoc[]> {
    return this.collection.find({ _id: { $in: ids } }).toArray();
  }

  /** 1 lectura paginada por _id; pide uno de mas. */
  list(filter: Document, after: string | undefined, limit: number): Promise<ChallengeDoc[]> {
    const query: Filter<ChallengeDoc> = after === undefined ? filter : { $and: [filter, { _id: { $gt: after } }] };
    return this.collection.find(query).sort({ _id: 1 }).limit(limit + 1).toArray();
  }

  /** 1 escritura atomica: reemplaza el contenido y sube la version. */
  replaceContent(id: string, content: Omit<ChallengeDoc, "_id" | "authorId" | "status" | "version" | "createdAt">): Promise<ChallengeDoc | null> {
    const { points, family, ...rest } = content;
    const unset = { ...(points === undefined ? { points: "" as const } : {}), ...(family === undefined ? { family: "" as const } : {}) };
    return this.collection.findOneAndUpdate(
      { _id: id },
      { $set: { ...rest, ...(points === undefined ? {} : { points }), ...(family === undefined ? {} : { family }) }, $inc: { version: 1 }, ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}) },
      { returnDocument: "after" },
    );
  }

  /** 1 escritura. */
  archive(id: string, now: Date): Promise<ChallengeDoc | null> {
    return this.collection.findOneAndUpdate({ _id: id }, { $set: { status: "archived", updatedAt: now }, $inc: { version: 1 } }, { returnDocument: "after" });
  }

  /** 1 lectura. */
  countByAuthor(authorId: string): Promise<number> {
    return this.collection.countDocuments({ authorId });
  }
}
