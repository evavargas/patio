import { Inject, Injectable } from "@nestjs/common";
import type { LevelRule } from "./level.ts";
import { RulesRepository } from "./rules.repository.ts";

export interface Rules {
  pointsByDifficulty: Record<string, number>;
  levels: LevelRule[];
  midnightToleranceMinutes: number;
}

/** Tolerancia por defecto de doc 09 (30 minutos). */
export const DEFAULT_MIDNIGHT_TOLERANCE_MINUTES = 30;

@Injectable()
export class RulesService {
  constructor(@Inject(RulesRepository) private readonly repository: Pick<RulesRepository, "find">) {}

  /** 1 lectura. Sin documento: sin puntos por dificultad, sin niveles y tolerancia por defecto (propuesta, ver open-questions). */
  async get(): Promise<Rules> {
    const doc = await this.repository.find();
    return {
      pointsByDifficulty: doc?.pointsByDifficulty ?? {},
      levels: doc?.levels ?? [],
      midnightToleranceMinutes: doc?.midnightToleranceMinutes ?? DEFAULT_MIDNIGHT_TOLERANCE_MINUTES,
    };
  }
}
