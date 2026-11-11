import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.ts";

export interface BannedWordsDoc {
  _id: "bannedWords";
  version: number;
  words: string[];
}

/** Doc 04: `settings` tiene un documento `bannedWords` (version y palabras). Indice: solo `_id`. */
@Injectable()
export class BannedWordsRepository {
  private readonly settings;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.settings = database.db.collection<BannedWordsDoc>("settings");
  }

  /** 1 operacion de lectura. */
  find(): Promise<BannedWordsDoc | null> {
    return this.settings.findOne({ _id: "bannedWords" });
  }
}
