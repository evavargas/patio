import { describe, expect, it } from "vitest";
import { type LevelRule, type Progress, computeLevel } from "./level.ts";

// Valores de prueba de doc 04 (no pedagogicos): 5 niveles (0 a 4), 3 dificultades.
const LEVELS: LevelRule[] = [
  { requirements: [{ difficulty: 1, min: 5 }] }, // 0 -> 1
  { requirements: [{ difficulty: 2, min: 4 }] }, // 1 -> 2
  { requirements: [{ difficulty: 2, min: 6 }, { difficulty: 3, family: "crear", min: 2 }], minScore: 200 }, // 2 -> 3
  { requirements: [{ difficulty: 3, min: 5 }] }, // 3 -> 4
];
const progress = (p: Partial<Progress> = {}): Progress => ({ score: 0, countsByDifficulty: {}, countsByDifficultyFamily: {}, ...p });

describe("computeLevel", () => {
  it("sin logros se queda en 0", () => {
    expect(computeLevel(LEVELS, 0, progress())).toBe(0);
  });

  it("falta uno: no sube; con el minimo exacto sube", () => {
    expect(computeLevel(LEVELS, 0, progress({ countsByDifficulty: { "1": 4 } }))).toBe(0);
    expect(computeLevel(LEVELS, 0, progress({ countsByDifficulty: { "1": 5 } }))).toBe(1);
  });

  it("sube varios niveles de una vez mientras se cumpla el requisito del nivel actual", () => {
    const p = progress({ countsByDifficulty: { "1": 5, "2": 4 } });
    expect(computeLevel(LEVELS, 0, p)).toBe(2);
  });

  it("exige TODOS los requisitos, incluido familia y puntaje minimo", () => {
    const base = { countsByDifficulty: { "1": 5, "2": 6, "3": 2 }, countsByDifficultyFamily: { "3:crear": 2 }, score: 200 };
    expect(computeLevel(LEVELS, 2, progress(base))).toBe(3);
    expect(computeLevel(LEVELS, 2, progress({ ...base, score: 199 }))).toBe(2);
    expect(computeLevel(LEVELS, 2, progress({ ...base, countsByDifficultyFamily: { "3:crear": 1 } }))).toBe(2);
    expect(computeLevel(LEVELS, 2, progress({ ...base, countsByDifficultyFamily: { "3:resolver": 2 } }))).toBe(2);
    expect(computeLevel(LEVELS, 2, progress({ ...base, countsByDifficulty: { "2": 5, "3": 2 } }))).toBe(2);
  });

  it("solo sube: nunca baja aunque los conteos no alcancen", () => {
    expect(computeLevel(LEVELS, 3, progress())).toBe(3);
  });

  it("no pasa del ultimo nivel definido", () => {
    expect(computeLevel(LEVELS, 0, progress({ score: 9999, countsByDifficulty: { "1": 99, "2": 99, "3": 99 }, countsByDifficultyFamily: { "3:crear": 99 } }))).toBe(4);
    expect(computeLevel(LEVELS, 4, progress({ score: 9999 }))).toBe(4);
  });

  it("sin reglas de nivel no sube", () => {
    expect(computeLevel([], 0, progress({ score: 9999, countsByDifficulty: { "1": 99 } }))).toBe(0);
  });

  it("un nivel sin requisitos ni puntaje minimo se cumple (no bloquea)", () => {
    expect(computeLevel([{ requirements: [] }], 0, progress())).toBe(1);
  });
});
