import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.ts";
import type { LevelRule } from "./level.ts";

/** `settings` con `_id: "rules"` (doc 04). Forma propuesta; el panel la escribira con su propio schema. */
export interface RulesDoc {
  _id: "rules";
  /** Puntos por dificultad, clave = dificultad. */
  pointsByDifficulty: Record<string, number>;
  levels: LevelRule[];
  midnightToleranceMinutes: number;
}

@Injectable()
export class RulesRepository {
  private readonly collection;

  constructor(@Inject(DatabaseService) database: Pick<DatabaseService, "db">) {
    this.collection = database.db.collection<RulesDoc>("settings");
  }

  /** 1 lectura por `_id`. */
  find(): Promise<RulesDoc | null> {
    return this.collection.findOne({ _id: "rules" });
  }
}
