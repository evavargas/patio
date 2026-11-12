import type { Challenge } from "@patio/contracts";

export type Family = NonNullable<Challenge["family"]>;

/** Un requisito para salir de un nivel: minimo de desafios logrados de dificultad D y, opcional, de una familia. */
export interface LevelRequirement {
  difficulty: number;
  family?: Family;
  min: number;
}

/** `levels[L]` = lo que hace falta para pasar del nivel L al L+1. Se cumplen TODOS los requisitos. */
export interface LevelRule {
  requirements: LevelRequirement[];
  minScore?: number;
}

/** Conteos acumulados del player. `countsByDifficultyFamily` usa claves `"<dificultad>:<familia>"`. */
export interface Progress {
  score: number;
  countsByDifficulty: Record<string, number>;
  countsByDifficultyFamily: Record<string, number>;
}

function meets(rule: LevelRule, progress: Progress): boolean {
  if (rule.minScore !== undefined && progress.score < rule.minScore) return false;
  return rule.requirements.every((r) => {
    const count = r.family === undefined ? progress.countsByDifficulty[String(r.difficulty)] : progress.countsByDifficultyFamily[`${r.difficulty}:${r.family}`];
    return (count ?? 0) >= r.min;
  });
}

/** Funcion pura. Solo sube; sube mientras se cumpla el requisito del nivel actual (puede saltar varios). */
export function computeLevel(levels: readonly LevelRule[], current: number, progress: Progress): number {
  let level = current;
  for (let rule = levels[level]; rule !== undefined && meets(rule, progress); rule = levels[level]) level++;
  return level;
}
